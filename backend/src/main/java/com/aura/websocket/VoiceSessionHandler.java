package com.aura.websocket;

import com.aura.service.LLMService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Component
@RequiredArgsConstructor
@Slf4j
public class VoiceSessionHandler extends TextWebSocketHandler {

    private final LLMService llmService;
    private final ObjectMapper objectMapper;

    // Per-session conversation history
    private final ConcurrentHashMap<String, List<Map<String, Object>>> sessionHistories
            = new ConcurrentHashMap<>();

    // Virtual thread executor for async LLM calls (Java 21)
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("WebSocket connected: {}", sessionId);
        sessionHistories.put(sessionId, new ArrayList<>());
        sendJson(session, "state_change", Map.of("state", "LISTENING"));
        sendJson(session, "connected", Map.of("message", "Connected to Aura Voice Agent"));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WebSocket closed: {} — {}", session.getId(), status);
        sessionHistories.remove(session.getId());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.error("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
        sessionHistories.remove(session.getId());
    }

    // ── Message handling ──────────────────────────────────────────────────────

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String sessionId = session.getId();
        String payload = message.getPayload();
        log.debug("Received from {}: {}", sessionId, payload);

        executor.submit(() -> {
            try {
                JsonNode json = objectMapper.readTree(payload);
                String type = json.path("type").asText();

                switch (type) {
                    case "message"  -> handleCustomerMessage(session, json);
                    case "end_call" -> handleEndCall(session);
                    case "ping"     -> sendJson(session, "pong", Map.of());
                    default         -> log.warn("Unknown message type: {}", type);
                }
            } catch (Exception e) {
                log.error("Error handling message for session {}: {}", sessionId, e.getMessage(), e);
                trySendError(session, "An error occurred processing your message.");
            }
        });
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    private void handleCustomerMessage(WebSocketSession session, JsonNode json) throws Exception {
        String text = json.path("text").asText("").trim();
        if (text.isEmpty()) return;

        String sessionId = session.getId();
        List<Map<String, Object>> history = sessionHistories.get(sessionId);
        if (history == null) return;

        // One turn at a time per session — concurrent turns would interleave
        // messages in the shared history and break the tool-call sequence
        synchronized (history) {
            log.info("Customer [{}]: {}", sessionId, text);

            // Echo transcript back to frontend
            sendJson(session, "transcript", Map.of("role", "customer", "text", text));

            // Indicate thinking
            sendJson(session, "state_change", Map.of("state", "THINKING"));

            // Add customer message to history
            history.add(Map.of("role", "user", "content", text));

            // Call LLM (includes tool-calling loop)
            String agentResponse = llmService.chat(history);
            log.info("Agent [{}]: {}", sessionId, agentResponse);

            // Send agent response
            sendJson(session, "transcript", Map.of("role", "agent", "text", agentResponse));
            sendJson(session, "agent_response", Map.of("text", agentResponse));
            sendJson(session, "state_change", Map.of("state", "SPEAKING"));
        }
    }

    private void handleEndCall(WebSocketSession session) throws Exception {
        String sessionId = session.getId();
        log.info("End call requested for session: {}", sessionId);

        List<Map<String, Object>> history = sessionHistories.get(sessionId);
        if (history == null || history.isEmpty()) {
            sendJson(session, "summary", Map.of("data",
                    fallbackSummary("NO_INTERACTION", "No conversation took place.")));
            sendJson(session, "state_change", Map.of("state", "IDLE"));
            return;
        }

        sendJson(session, "state_change", Map.of("state", "THINKING"));

        try {
            String rawSummary;
            synchronized (history) {
                rawSummary = llmService.generateSummary(history);
            }
            log.info("Generated summary: {}", rawSummary);

            // Parse and validate summary JSON
            JsonNode summaryNode = objectMapper.readTree(rawSummary);
            sendJson(session, "summary", Map.of("data", summaryNode));
        } catch (Exception e) {
            log.error("Summary generation failed: {}", e.getMessage());
            sendJson(session, "summary", Map.of("data",
                    fallbackSummary("UNKNOWN", "Call summary could not be generated.")));
        }

        sendJson(session, "state_change", Map.of("state", "IDLE"));
    }

    // ── Utility ───────────────────────────────────────────────────────────────

    // Map.of() rejects null values, so build the fallback as a JSON node
    private ObjectNode fallbackSummary(String intent, String callSummary) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("customer_intent", intent);
        node.putNull("order_id");
        node.put("resolution_status", "UNRESOLVED");
        node.put("call_summary", callSummary);
        return node;
    }

    private void sendJson(WebSocketSession session, String type, Map<String, Object> data) {
        try {
            if (!session.isOpen()) return;

            ObjectNode msg = objectMapper.createObjectNode();
            msg.put("type", type);
            data.forEach((key, value) -> {
                if (value == null) {
                    msg.putNull(key);
                } else if (value instanceof String s) {
                    msg.put(key, s);
                } else if (value instanceof JsonNode jn) {
                    msg.set(key, jn);
                } else {
                    msg.set(key, objectMapper.valueToTree(value));
                }
            });

            synchronized (session) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(msg)));
            }
        } catch (Exception e) {
            log.error("Failed to send message to session {}: {}", session.getId(), e.getMessage());
        }
    }

    private void trySendError(WebSocketSession session, String errorMessage) {
        try {
            sendJson(session, "error", Map.of("message", errorMessage));
            sendJson(session, "state_change", Map.of("state", "LISTENING"));
        } catch (Exception ignored) {}
    }
}
