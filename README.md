# Aura Skincare — AI Voice CX Agent 🌿

An AI-powered browser-based voice customer support agent for **Aura Skincare**, a premium organic Indian skincare brand. Users can speak naturally with **Aria**, the AI agent, and get instant help with orders, returns, shipping policies, and cancellations.

---

## 🔗 Live Links

| Resource | URL |
|---|---|
| **Frontend (Vercel)** | *(add after deployment)* |
| **Backend API (Railway)** | *(add after deployment)* |
| **Demo Video** | *(add link)* |

---

## ✨ Features

- 🎤 **Voice conversation** — Speak naturally using your microphone; hear Aria respond
- 📦 **Live order lookup** — Ask about any order by ID (ORD-101, ORD-102, ORD-103)
- ❌ **Order cancellation** — Cancel eligible orders via voice
- 📋 **Policy enforcement** — Returns, shipping, COD — Aria follows brand policies strictly
- 🛡️ **Guardrails** — Out-of-scope requests politely declined; graceful error handling
- 📝 **Post-call transcript** — Full chronological conversation log
- 📊 **Structured JSON summary** — Machine-readable call outcome generated automatically
- 🌙 **Dark / Light mode** — Persisted to localStorage; respects system preference
- 🧪 **Test orders panel** — All 3 sample orders visible on screen for instant testing
- 🚀 **Coming soon panel** — Wake word detection & CSV bulk import (UI preview)

---

## 🏗️ Architecture

```
Browser (React + Vite)
  ├── SpeechRecognition API  →  STT (zero latency, free, en-IN locale)
  ├── WebSocket              ↔  Spring Boot backend
  │     ├── VoiceSessionHandler  →  per-session conversation state
  │     ├── LLMService           →  Groq LLaMA 3.3 70B (tool-calling loop)
  │     │     ├── get_order_details()  →  MySQL query
  │     │     └── cancel_order()       →  MySQL update + policy check
  │     └── SummaryService       →  post-call JSON generation
  └── SpeechSynthesis API    →  TTS (zero latency, free, en-IN voice)
```

**Voice Pipeline per turn:**
1. Customer speaks → `SpeechRecognition` fires final result
2. Text sent to Spring Boot over WebSocket
3. Groq LLaMA 3.3 70B processes with full system prompt + tools
4. If tool call detected → execute against MySQL → re-submit to Groq
5. Final text response returned to frontend
6. `SpeechSynthesis` speaks agent response

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript |
| STT | Browser Web Speech API (`SpeechRecognition`, en-IN) |
| TTS | Browser Web Speech API (`SpeechSynthesis`, en-IN voice) |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Backend | Java 21 + Spring Boot 3.2 |
| Database | MySQL 8 + Spring Data JPA + Flyway migrations |
| WebSocket | Spring WebSocket (`TextWebSocketHandler`) |
| Deployment | Vercel (frontend) + Railway (backend + MySQL) |

---

## 🗄️ Mock Order Database

| Order ID | Customer | Product | Value | Status | Notes |
|---|---|---|---|---|---|
| **ORD-101** | Priya Sharma | Vitamin C Serum (30ml) | ₹699 | Out for Delivery | BlueDart — BD-982103. Expected by 6 PM today |
| **ORD-102** | Rahul Verma | Hydrating Sunscreen SPF 50 | ₹499 | Delivered | Delhivery — DL-441029. Delivered 14 days ago |
| **ORD-103** | Ananya Patel | Green Tea Face Wash + Toner | ₹850 | Processing | Ordered 3 hours ago. Eligible for cancellation |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 20+
- Java 21 + Maven
- MySQL 8

### 1. Clone & setup environment

```bash
git clone <your-repo-url>
cd aura-skincare-voice-agent
```

### 2. Backend

```bash
cd backend

# Copy env template and fill in your values
cp .env.example .env

# Edit application.properties with your MySQL credentials
# Set GROQ_API_KEY in application.properties or as env variable

# Run
./mvnw spring-boot:run
# Backend starts at http://localhost:8080
# Flyway auto-creates tables and seeds the 3 test orders
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# .env already points to ws://localhost:8080/ws/voice

npm install
npm run dev
# Frontend starts at http://localhost:5173
```

### 4. Test

1. Open Chrome or Edge (required for Web Speech API)
2. Navigate to `http://localhost:5173`
3. Click **Start Call** and allow microphone access
4. Try: *"Where is my order ORD-101?"*

> ⚠️ **Browser requirement**: The Web Speech API (`SpeechRecognition`) works only in **Google Chrome** and **Microsoft Edge**. A warning is shown on other browsers.

---

## 🧪 Test Scenarios

| Say this | Expected |
|---|---|
| "Where is my order ORD-101?" | Tracks Vitamin C Serum, out for delivery via BlueDart |
| "I want to return ORD-102" | Politely declines (delivered 14 days ago, outside 7-day policy) |
| "Cancel my order ORD-103" | Cancels the order (Processing status → eligible) |
| "I bought an opened product 20 days ago, can I return it?" | Policy explained, return declined |
| "Book me a flight to Goa" | Politely declined as out-of-scope |
| "Check order ORD-999" | Graceful "order not found" response |

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
# Set environment variable: VITE_WS_URL=wss://your-railway-backend.up.railway.app/ws/voice
```

### Backend → Railway

1. Create a new Railway project
2. Add a **MySQL** plugin (Railway auto-sets env vars)
3. Deploy the `backend/` directory
4. Set environment variables:
   - `GROQ_API_KEY` = your Groq API key
   - `FRONTEND_URL` = your Vercel URL
5. Railway auto-runs Flyway migrations on startup

---

## 💭 How I Think — Section 9 Answers

### 1. Why this architecture and tech stack?

**Browser-native STT/TTS** (Web Speech API) was the most impactful architectural decision. Server-side STT adds 300–800ms of network latency on every user utterance — for voice conversations, that latency is jarring and unnatural. The browser's built-in `SpeechRecognition` fires results with near-zero latency, making the conversation feel real-time. The trade-off is Chrome/Edge-only support, which is acceptable for an internal evaluation tool.

**Groq for LLM** because it processes tokens at 500+ tokens/second — dramatically faster than OpenAI or Anthropic for inference. Lower LLM latency = shorter "thinking" pauses between the customer speaking and Aria responding.

**Spring Boot + Java 21** for the backend: virtual threads (Project Loom) make concurrent LLM API calls (which are heavily I/O-bound) cheap and efficient without the complexity of reactive programming. Spring's WebSocket support gives clean per-session state management with `ConcurrentHashMap`.

**MySQL** over in-memory storage for real-world fidelity — the database is actually updated when an order is cancelled, making the system stateful and realistic.

### 2. Most difficult part?

The **tool-calling loop** was the trickiest part to get right. Groq returns a response that either contains text *or* a `tool_calls` array — never both simultaneously. The backend must:
1. Detect the tool call
2. Serialize the assistant's message (including `tool_calls`) back into conversation history
3. Execute the tool against MySQL
4. Append the tool result as a `role: "tool"` message
5. Re-call Groq to get the final natural language response

Getting the message history format exactly right (particularly the `tool_call_id` linkage between assistant and tool messages) required careful testing against Groq's API. The solution was a clean `for (int iteration = 0; iteration < 3; iteration++)` loop in `LLMService.java` with proper message history building.

### 3. With one more week, what would you improve first?

**Streaming STT with Deepgram** — replace browser `SpeechRecognition` with Deepgram's WebSocket streaming API. This would:
- Remove the Chrome/Edge browser restriction entirely
- Enable server-side audio processing (cleaner architecture)
- Support partial transcripts (you can start sending to LLM before the user finishes speaking)
- Work reliably with accented speech and background noise

The current browser API is excellent for a prototype but would need this upgrade for production.

### 4. At 1,000 conversations/day — what changes?

**Infrastructure:**
- **Redis** for session state (replace in-memory `ConcurrentHashMap`) to allow horizontal scaling of Spring Boot pods
- **Load balancer** with WebSocket-sticky sessions (or migrate to STOMP + message broker)

**AI/Latency:**
- **Groq rate limit management** — 1,000 calls/day hits free tier limits; need paid tier + exponential backoff + queue
- **Response caching** for repeated policy questions (e.g., "what's your return policy?")

**Reliability:**
- **Circuit breaker** (Resilience4j) around Groq API calls — fallback to a simpler response if Groq is down
- **Async summary generation** — decouple post-call summary from the WebSocket session lifecycle

**Observability:**
- **Prometheus + Grafana** for latency percentiles (p50, p95, p99) per pipeline stage
- **Structured logging** with conversation IDs for call replay and debugging
- **Call recording** (transcript + summary) persisted to database for quality analysis

---

## 📝 Approach Note

Built a modular browser-based voice pipeline where the STT and TTS happen entirely in the browser (Web Speech API, zero latency, zero cost), while the LLM reasoning and order database live in a Spring Boot backend connected via WebSocket. Groq's LLaMA 3.3 70B handles natural conversation with function-calling for real-time order lookups and cancellations against MySQL, with Aria's persona and brand policies enforced entirely in the system prompt.

---

## 📁 Project Structure

```
aura-skincare-voice-agent/
├── backend/               # Spring Boot 3 + Java 21
│   ├── src/main/java/com/aura/
│   │   ├── config/        # WebSocket, CORS, Jackson config
│   │   ├── model/         # Order JPA entity
│   │   ├── repository/    # Spring Data JPA
│   │   ├── service/       # LLMService (Groq), OrderService (tools)
│   │   └── websocket/     # VoiceSessionHandler (core orchestrator)
│   └── src/main/resources/
│       └── db/migration/  # Flyway SQL (creates + seeds orders table)
│
└── frontend/              # React 18 + Vite 5 + TypeScript
    └── src/
        ├── components/    # CallInterface, Waveform, Transcript, Summary, etc.
        ├── hooks/         # useSpeechRecognition, useSpeechSynthesis, useWebSocket
        └── types/         # Shared TypeScript types
```
