/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WebSocket URL for the voice agent backend.
   *  Production:  wss://aura-ai-chat-bot.onrender.com/ws/voice
   *  Local dev:   ws://localhost:8080/ws/voice  (fallback used when unset)
   */
  readonly VITE_WS_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
