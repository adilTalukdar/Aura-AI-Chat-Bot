package com.aura.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LLMService {

    @Value("${groq.api.key}")
    private String groqApiKey;

    @Value("${groq.api.url}")
    private String groqApiUrl;

    @Value("${groq.model}")
    private String groqModel;

    private final ObjectMapper objectMapper;
    private final OrderService orderService;

    private static final String SYSTEM_PROMPT = """
        You are Aria, a friendly, professional, and warm customer support specialist for Aura Skincare — a premium organic Indian skincare brand.
        
        PERSONALITY:
        - Speak naturally and conversationally, as if talking on the phone.
        - Be concise: 2-3 sentences maximum per response.
        - Be empathetic and warm, especially when a customer is frustrated.
        - Do NOT use bullet points, numbered lists, or markdown in your responses.
        - Do NOT say "I understand your concern" repetitively — vary your responses.
        - Greet the customer warmly at the start of each call.
        
        BRAND POLICIES (follow these strictly):
        
        SHIPPING:
        - Free delivery on orders above ₹499.
        - Orders below ₹499 have a ₹50 shipping fee.
        - Standard delivery takes 3-5 business days.
        
        RETURNS & REFUNDS:
        - Returns accepted within 7 days of delivery.
        - Products must be unopened, unused, and in original packaging.
        - Damaged/defective items must be reported within 48 hours of delivery with photos.
        - No returns for opened, used, or items outside the 7-day window.
        
        CANCELLATIONS:
        - Orders can ONLY be cancelled when status is "Processing".
        - Once Shipped or Out for Delivery, cancellation is NOT possible.
        - Customers may refuse delivery at the doorstep as an alternative.
        - Use the cancel_order tool when a customer requests cancellation.
        
        CASH ON DELIVERY (COD):
        - Available for orders up to ₹2,500.
        - Payment by cash or UPI at doorstep.
        
        GUARDRAILS:
        - NEVER promise anything outside these policies, even if the customer pushes back.
        - Politely but firmly decline requests that violate policy.
        - For completely out-of-scope questions (flights, restaurants, etc.), say you can only help with Aura Skincare queries.
        - If an order ID is not found, ask the customer to verify it — do NOT hallucinate order details.
        - If you are genuinely unsure, say you will escalate to a human agent.
        - ALWAYS use the available tools when a customer mentions an order ID.
        
        TOOLS:
        - Use get_order_details when a customer provides an order ID or asks about their order.
        - Use cancel_order ONLY when the customer explicitly requests cancellation AND confirms.
        - After calling a tool, use the result to respond naturally to the customer.
        """;

    private static final String TOOL_DEFINITIONS = """
        [
          {
            "type": "function",
            "function": {
              "name": "get_order_details",
              "description": "Retrieve order details from the database using an order ID. Use this whenever a customer mentions an order ID or asks about their order status, tracking, or delivery.",
              "parameters": {
                "type": "object",
                "properties": {
                  "order_id": {
                    "type": "string",
                    "description": "The order ID provided by the customer, e.g. ORD-101, ORD-102, ORD-103"
                  }
                },
                "required": ["order_id"]
              }
            }
          },
          {
            "type": "function",
            "function": {
              "name": "cancel_order",
              "description": "Cancel a customer's order. Only works if the order status is Processing. Returns success or a policy error if cancellation is not possible.",
              "parameters": {
                "type": "object",
                "properties": {
                  "order_id": {
                    "type": "string",
                    "description": "The order ID to cancel, e.g. ORD-103"
                  }
                },
                "required": ["order_id"]
              }
            }
          }
        ]
        """;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Send a conversation to the Groq LLM and handle tool-calling loops.
     *
     * @param conversationHistory list of {role, content} message maps (mutable — will be appended to)
     * @return the final text response from the assistant
     */
    public String chat(List<Map<String, Object>> conversationHistory) throws Exception {
        // Inject system prompt at the beginning if not present
        if (conversationHistory.isEmpty() ||
                !"system".equals(conversationHistory.get(0).get("role"))) {
            conversationHistory.add(0, Map.of("role", "system", "content", SYSTEM_PROMPT));
        }

        // Tool-calling loop (max 3 iterations to prevent infinite loops)
        for (int iteration = 0; iteration < 3; iteration++) {
            String requestBody = buildRequestBody(conversationHistory, true);
            log.debug("Groq request (iteration {}): {}", iteration, requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(groqApiUrl))
                    .header("Authorization", "Bearer " + groqApiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(30))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            log.debug("Groq response status: {}", response.statusCode());

            if (response.statusCode() != 200) {
                log.error("Groq API error {}: {}", response.statusCode(), response.body());
                return "I'm having some technical difficulties right now. Please try again in a moment.";
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            JsonNode choice = responseJson.path("choices").get(0).path("message");

            // Check for tool calls
            JsonNode toolCalls = choice.path("tool_calls");
            if (!toolCalls.isMissingNode() && toolCalls.isArray() && toolCalls.size() > 0) {
                // Add assistant message with tool_calls to history
                Map<String, Object> assistantMsg = buildAssistantMessageWithToolCalls(choice);
                conversationHistory.add(assistantMsg);

                // Execute each tool call
                for (JsonNode toolCall : toolCalls) {
                    String toolCallId = toolCall.path("id").asText();
                    String toolName = toolCall.path("function").path("name").asText();
                    String toolArgs = toolCall.path("function").path("arguments").asText();

                    log.info("Executing tool: {} with args: {}", toolName, toolArgs);

                    String toolResult = executeToolCall(toolName, toolArgs);
                    log.info("Tool result: {}", toolResult);

                    // Add tool result to history
                    conversationHistory.add(Map.of(
                            "role", "tool",
                            "tool_call_id", toolCallId,
                            "content", toolResult
                    ));
                }
                // Continue loop to get final response after tool execution
                continue;
            }

            // No tool calls — extract final text response
            String content = choice.path("content").asText();
            if (content.isBlank()) {
                content = "I'm sorry, I couldn't generate a response. Please try again.";
            }

            // Add assistant response to history
            conversationHistory.add(Map.of("role", "assistant", "content", content));
            return content;
        }

        return "I apologize, I'm having trouble processing your request. Please try again.";
    }

    /**
     * Generate a structured post-call JSON summary.
     */
    public String generateSummary(List<Map<String, Object>> conversationHistory) throws Exception {
        List<Map<String, Object>> summaryMessages = new java.util.ArrayList<>(conversationHistory);
        summaryMessages.add(Map.of("role", "user", "content",
            """
            Based on this conversation, generate a structured JSON summary. 
            Output ONLY valid JSON with no explanation, no markdown, no code blocks.
            Use exactly these fields:
            {
              "customer_intent": "one of: ORDER_TRACKING | ORDER_CANCELLATION | RETURN_REQUEST | POLICY_QUERY | OUT_OF_SCOPE | GENERAL_INQUIRY",
              "order_id": "the order ID mentioned, or null if none",
              "resolution_status": "one of: RESOLVED | UNRESOLVED | ESCALATED",
              "call_summary": "1-2 sentence summary of what happened in the call"
            }
            """));

        String requestBody = buildRequestBody(summaryMessages, false);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(groqApiUrl))
                .header("Authorization", "Bearer " + groqApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(30))
                .build();

        HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("Groq summary error: {}", response.body());
            return "{\"error\": \"Failed to generate summary\"}";
        }

        JsonNode responseJson = objectMapper.readTree(response.body());
        return responseJson.path("choices").get(0).path("message").path("content").asText();
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private String buildRequestBody(List<Map<String, Object>> messages, boolean includeTools) throws Exception {
        ObjectNode body = objectMapper.createObjectNode();
        body.put("model", groqModel);
        body.put("temperature", 0.7);
        body.put("max_tokens", 512);

        // Build messages array
        ArrayNode messagesNode = body.putArray("messages");
        for (Map<String, Object> msg : messages) {
            ObjectNode msgNode = messagesNode.addObject();
            msgNode.put("role", (String) msg.get("role"));

            if (msg.containsKey("content") && msg.get("content") != null) {
                msgNode.put("content", (String) msg.get("content"));
            } else {
                msgNode.putNull("content");
            }

            if (msg.containsKey("tool_call_id")) {
                msgNode.put("tool_call_id", (String) msg.get("tool_call_id"));
            }

            if (msg.containsKey("tool_calls")) {
                // Re-serialize tool_calls
                Object toolCallsObj = msg.get("tool_calls");
                JsonNode toolCallsNode = objectMapper.valueToTree(toolCallsObj);
                msgNode.set("tool_calls", toolCallsNode);
            }
        }

        if (includeTools) {
            JsonNode toolsNode = objectMapper.readTree(TOOL_DEFINITIONS);
            body.set("tools", toolsNode);
            body.put("tool_choice", "auto");
        }

        return objectMapper.writeValueAsString(body);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildAssistantMessageWithToolCalls(JsonNode assistantMessage) {
        java.util.HashMap<String, Object> msg = new java.util.HashMap<>();
        msg.put("role", "assistant");

        String content = assistantMessage.path("content").asText(null);
        msg.put("content", content);

        // Store tool_calls as a list of maps for re-serialization
        JsonNode toolCalls = assistantMessage.path("tool_calls");
        java.util.List<Object> toolCallsList = new java.util.ArrayList<>();
        for (JsonNode tc : toolCalls) {
            toolCallsList.add(objectMapper.convertValue(tc, Object.class));
        }
        msg.put("tool_calls", toolCallsList);
        return msg;
    }

    private String executeToolCall(String toolName, String toolArgs) {
        try {
            JsonNode args = objectMapper.readTree(toolArgs);
            String orderId = args.path("order_id").asText();

            return switch (toolName) {
                case "get_order_details" -> orderService.getOrderDetails(orderId);
                case "cancel_order"      -> orderService.cancelOrder(orderId);
                default -> "{\"error\": \"Unknown tool: " + toolName + "\"}";
            };
        } catch (Exception e) {
            log.error("Tool execution error for {}: {}", toolName, e.getMessage());
            return "{\"error\": \"Tool execution failed: " + e.getMessage() + "\"}";
        }
    }
}
