package com.aura.config;

import com.aura.websocket.VoiceSessionHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    @Autowired
    private VoiceSessionHandler voiceSessionHandler;

    // Reads FRONTEND_URL from environment / application.properties.
    // Defaults to localhost for local development if the variable is not set.
    @Value("${allowed.origins:http://localhost:5173}")
    private String allowedOrigin;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(voiceSessionHandler, "/ws/voice")
                .setAllowedOrigins(
                        allowedOrigin,                          // production: https://aura-ai-chat-bot-sand.vercel.app
                        "http://localhost:5173",                // Vite dev server
                        "http://localhost:4173"                 // Vite preview server
                );
    }
}
