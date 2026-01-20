 # AI Interview Coach

 Real-time interview practice with a voice-based AI interviewer. Built on Cloudflare Workers + Durable Objects, with WebRTC audio via Cloudflare RealtimeKit.

 ## What it does

 - **Live voice interview** (WebRTC)
 - **Configurable interviewer persona + scenario** (phone screen, behavioral, technical)
 - **Optional document grounding** (resume + job description) via Vectorize RAG
 - **Real-time coaching HUD** (question type, STAR progress, tips)
 - **Post-interview report** (summary + scoring)

 ## Why Cloudflare Realtime Agents

 This project follows the pattern from Cloudflare’s Realtime Agents guide:
 https://developers.cloudflare.com/realtime/agents/getting-started/

 Cloudflare’s approach is a good fit here because the **meeting participant** (the agent) runs as a Durable Object at the edge and can join the same WebRTC room as the user, keeping the “audio loop” short:

 - Durable Objects provide the long-lived stateful runtime for an agent.
 - RealtimeKit abstracts WebRTC/SFU plumbing but still gives you programmatic access to a meeting.
 - Workers AI + Vectorize integrate cleanly into the same Worker.

 ## Tech stack

 - **Frontend**: React + TypeScript + Vite + Tailwind
 - **Backend**: Cloudflare Workers + Durable Objects
 - **Real-time audio**: Cloudflare RealtimeKit (WebRTC)
 - **STT**: Deepgram
 - **LLM**: Workers AI
 - **TTS**: ElevenLabs
 - **RAG**: Vectorize

 ## Project structure

```
 src/                          # React frontend
 ├── components/
 │   ├── landing/              # Entry flow
 │   ├── persona/              # Scenario + persona customization
 │   ├── preparation/          # Resume/JD upload
 │   ├── meeting/              # MeetingRoom + InsightsHUD
 │   └── report/               # Post-interview report UI
 ├── hooks/                    # React hooks (useSession)
 └── lib/                      # API client, shared types

 worker/                       # Cloudflare Worker backend
 ├── index.ts                  # Router + WebSocket forwarding
 ├── routes/                   # REST API handlers (/api/*)
 ├── agents/                   # InterviewAgent Durable Object (RealtimeAgent)
 ├── insights/                 # InsightGenerator (WS coaching stream)
 ├── rag/                      # Parsing/chunking + Vectorize indexing/query
 ├── report/                   # Report generation
 ├── sessions/                 # SessionManager Durable Object (SQLite)
 └── utils/                    # RealtimeKit helpers, logging
```

 ## Architecture (high level)

 ```mermaid
 flowchart LR
   U[Browser (React)]
   API[Worker API routes]
   SFU[Cloudflare RealtimeKit (WebRTC + SFU)]
   IA[InterviewAgent (Durable Object)]
   SM[SessionManager (Durable Object + SQLite)]
   IG[InsightGenerator]
   STT[Deepgram STT]
   LLM[Workers AI]
   TTS[ElevenLabs TTS]
   V[(Vectorize)]

   U -->|REST /api/*| API
   API --> SM
   API -->|init()| IA

   U <--> |WebRTC audio| SFU
   IA <--> |join + produce/consume| SFU

   IA --> STT
   STT --> LLM
   LLM --> TTS
   TTS --> IA

   IA --> IG
   IG -->|WebSocket /api/insights/ws| U

   IA -->|RAG query| V
   API -->|RAG index/upload| V
 ```

 ## STT-LLM-TTS Pipeline

 ```
 sequenceDiagram
  participant User as User (mic)
  participant SFU as RealtimeKit SFU
  participant Agent as InterviewAgent (DO)
  participant STT as Deepgram STT
  participant LLM as Workers AI
  participant TTS as ElevenLabs TTS

  User->>SFU: WebRTC audio (mic frames)
  SFU->>Agent: Incoming audio frames
  Agent->>STT: Stream audio / request transcript
  STT-->>Agent: Final transcript text
  Agent->>LLM: Prompt (persona + scenario + timeboxing + optional RAG)
  LLM-->>Agent: Response text
  Agent->>TTS: Synthesize speech
  TTS-->>Agent: Audio bytes/stream
  Agent->>SFU: Publish audio into meeting
  SFU-->>User: WebRTC audio (agent voice)
 ```

 ## Setup

 - Copy `.dev.vars.example` to `.dev.vars` (for local dev)
 - Install deps: `npm install`
 - Run locally: `npm run dev`
 - Deploy: `npm run deploy`

 See `SETUP.md` for the step-by-step Cloudflare RealtimeKit app setup.

 ## Environment variables

 These are required (local via `.dev.vars`, prod via Wrangler secrets/vars):

 ```bash
 # Cloudflare
 ACCOUNT_ID=
 API_TOKEN=
 REALTIME_APP_ID=
 REALTIME_PRESET_ID=
 REALTIME_PRESET_NAME=

 # Speech / voice
 DEEPGRAM_API_KEY=
 ELEVENLABS_API_KEY=

 # Optional
 ELEVENLABS_VOICE_FEMALE=
 ELEVENLABS_VOICE_MALE=
 ELEVENLABS_MODEL=
 ```

 ## References

 - Cloudflare Realtime overview: https://developers.cloudflare.com/realtime/
 - RealtimeKit: https://developers.cloudflare.com/realtime/realtimekit/
 - Realtime Agents guide: https://developers.cloudflare.com/realtime/agents/getting-started/
 - Durable Objects: https://developers.cloudflare.com/durable-objects/
 - Workers AI: https://developers.cloudflare.com/workers-ai/
 - Vectorize: https://developers.cloudflare.com/vectorize/
