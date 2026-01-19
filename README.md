# AI Interview Coach

Real-time AI-powered interview practice platform built on Cloudflare's edge infrastructure.

## Features

- **Real-time Voice Interviews** - WebRTC-powered conversations with AI interviewers
- **Customizable Personas** - Choose interviewer style, demeanor, and difficulty
- **Multiple Scenarios** - Phone screens, technical rounds, behavioral interviews
- **Document Upload** - Upload resume and job description for personalized questions
- **RAG-Powered Context** - AI uses your background to ask relevant questions
- **Real-time Coaching HUD** - Live insights, STAR progress tracking, and tips

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Cloudflare Workers + Durable Objects
- **Real-time**: RealtimeKit (WebRTC) for voice + WebSocket for insights
- **AI**: Workers AI (Llama 3.1), Deepgram STT, ElevenLabs TTS
- **RAG**: Vectorize for resume/JD context

## Project Structure

```
src/                          # React frontend
├── components/
│   ├── landing/              # Landing page
│   ├── persona/              # Scenario & persona customization
│   ├── preparation/          # Document upload (resume/JD)
│   └── meeting/              # Interview room + InsightsHUD
├── hooks/                    # React hooks (useSession)
└── lib/                      # API client, types

worker/                       # Cloudflare Worker backend
├── agents/                   # InterviewAgent (RealtimeAgent)
├── insights/                 # InsightGenerator for real-time coaching
├── routes/                   # API routes
├── sessions/                 # SessionManager (Durable Object)
├── rag/                      # RAG service (parse, chunk, index, query)
└── utils/                    # RealtimeKit, logging utilities
```

## Architecture

```
┌─────────────┐    WebRTC     ┌──────────────────┐
│   Browser   │◄────────────►│  RealtimeKit SFU │
│  (React UI) │               └────────┬─────────┘
└──────┬──────┘                        │
       │ REST                          │ Audio
       ▼                               ▼
┌──────────────┐              ┌──────────────────┐
│   Worker     │◄────────────►│  InterviewAgent  │
│  (API Routes)│              │ (Durable Object) │
└──────┬───────┘              └────────┬─────────┘
       │                               │
       ▼                               ▼
┌──────────────┐              ┌──────────────────┐
│ SessionMgr   │              │   AI Pipeline    │
│ (DO + SQLite)│              │ STT→LLM→TTS      │
└──────────────┘              └────────┬─────────┘
                                       │
                              ┌────────▼─────────┐
                              │    Vectorize     │
                              │  (RAG Context)   │
                              └──────────────────┘
```

## Real-time Insights HUD

During interviews, a coaching sidebar provides:
- **Coaching Tips** - Actionable advice based on your responses
- **Question Type** - Classification (behavioral, technical, situational, etc.)
- **STAR Progress** - For behavioral questions, tracks Situation/Task/Action/Result
- **Live Transcript** - Real-time conversation log

The InsightsHUD connects via WebSocket to receive updates from the InsightGenerator running in the Durable Object.

## Setup

1. Copy `.dev.vars.example` to `.dev.vars` and add API keys
2. `npm install`
3. `npm run dev` (local) or `npm run deploy` (production)

## Environment Variables

```
REALTIMEKIT_API_KEY=       # Cloudflare RealtimeKit
REALTIMEKIT_ORG_ID=        # RealtimeKit org ID
DEEPGRAM_API_KEY=          # Speech-to-text
ELEVENLABS_API_KEY=        # Text-to-speech
```
