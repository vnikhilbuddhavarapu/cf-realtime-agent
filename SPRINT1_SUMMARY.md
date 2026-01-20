# Sprint 1: Voice AI Agent - Complete ✅

## Objective
Build a working real-time voice AI interview agent using Cloudflare RealtimeKit that can:
- Join meetings automatically
- Listen to user speech (STT)
- Generate contextual responses (AI)
- Speak responses naturally (TTS)
- Conduct bidirectional voice conversations

## What We Built

### Core Components

1. **InterviewAgent (Durable Object)**
   - Extends `RealtimeAgent` from `@cloudflare/realtime-agents`
   - Manages the voice AI pipeline
   - Handles participant events
   - Location: `worker/agents/InterviewAgent.ts`

2. **Voice Pipeline**
   ```
   User Speech → RealtimeKitTransport → DeepgramSTT → InterviewTextProcessor → ElevenLabsTTS → RealtimeKitTransport → User Hears AI
   ```

3. **SessionManager (Durable Object)**
   - Manages interview sessions and roleplays
   - Stores session data in SQL storage
   - Tracks meeting lifecycle
   - Location: `worker/sessions/SessionManager.ts`

4. **API Routes**
   - `/api/session` - Create/get sessions
   - `/api/roleplay` - Create roleplays with scenario/persona
   - `/api/meeting/start` - Create meeting and initialize agent
   - `/api/meeting/end` - End meeting
   - Location: `worker/routes/api.ts`

## Critical Fixes That Made It Work

### 1. **Durable Object Invocation Pattern**
**Problem:** Agent's `init()` method wasn't being called.

**Solution:** Call `stub.init()` directly via RPC from the API route:
```typescript
const agentId = env.INTERVIEW_AGENT.idFromName(meetingId);
const agentStub = env.INTERVIEW_AGENT.get(agentId);
await agentStub.init(meetingId, meetingId, authToken, workerHost, ...);
```

**Key Learning:** Durable Objects support direct RPC method calls on stubs. No need for HTTP fetch wrappers.

### 2. **Worker URL Format**
**Problem:** Agent initialization failed with incorrect URL format.

**Solution:** Pass hostname only (no `https://` protocol):
```typescript
const workerHost = url.host; // "realtime-voice-agent.acme-corp.workers.dev"
await agentStub.init(..., workerHost, ...); // NOT https://...
```

**Key Learning:** RealtimeKit SDK expects just the hostname per npm docs.

### 3. **Separate Participant Tokens**
**Problem:** User and agent were in different meetings.

**Solution:** Create separate participant tokens:
- Agent token: Created during meeting creation
- Human token: Created separately for the user to join

```typescript
// Agent participant
const { meetingId, authToken } = await createRealtimeKitMeeting(...);

// Human participant
const humanParticipantResponse = await fetch(
  `https://api.cloudflare.com/.../meetings/${meetingId}/participants`,
  { method: "POST", ... }
);
```

### 4. **Event Handler Registration**
**Problem:** Participant events not firing.

**Solution:** 
- Register event handlers BEFORE calling `meeting.join()`
- Filter out agent's own join event
- Only speak greeting when real participants join

```typescript
meeting.participants.joined.on('participantJoined', (participant) => {
  if (participant.id === meeting.self.id) return; // Skip agent's own join
  textProcessor.speak(`Hello! Welcome to your interview.`);
});

await meeting.join();
```

### 5. **RealtimeKit Internal Routes**
**Problem:** Pipeline communication failing.

**Solution:** Route `/agentsInternal` requests to agent's `fetch()` method:
```typescript
if (path.startsWith("/agentsInternal")) {
  const meetingId = url.searchParams.get("meetingId");
  const agentId = env.INTERVIEW_AGENT.idFromName(meetingId);
  const stub = env.INTERVIEW_AGENT.get(agentId);
  return stub.fetch(request);
}
```

**Key Learning:** RealtimeKit SDK uses `/agentsInternal` for pipeline communication.

## Architecture Decisions

### Durable Object Naming
- **Agent DO:** Named by `meetingId` (not roleplayId)
- **Session DO:** Named by `sessionId`

**Rationale:** RealtimeKit SDK passes `meetingId` in query params to `/agentsInternal`, so agent must be retrievable by meetingId.

### Pipeline Components
1. **RealtimeKitTransport** - Handles WebRTC audio I/O
2. **DeepgramSTT** - Speech-to-text transcription
3. **InterviewTextProcessor** - AI response generation (Workers AI)
4. **ElevenLabsTTS** - Text-to-speech synthesis

### Media Configuration
```typescript
new RealtimeKitTransport(meetingId, authToken, [
  {
    media_kind: 'audio',
    stream_kind: 'microphone',
    preset_name: 'group_call_host',
  },
]);
```

**Key Learning:** Media config array is required for audio to work.

## Testing & Verification

### Successful Logs
```
✅ "Initializing InterviewAgent"
✅ "Pipeline initialized successfully"
✅ "Agent successfully joined meeting"
✅ "🎉 PARTICIPANT JOINED EVENT FIRED"
✅ "Speaking greeting to participant"
✅ "Received transcript" - STT working
✅ "Generated AI response" - AI working
✅ ElevenLabs TTS generation - TTS working
```

### Test Flow
1. Create session via `/api/session`
2. Create roleplay via `/api/roleplay`
3. Start meeting via `/api/meeting/start`
4. User joins with returned `joinUrl`
5. Agent greets user automatically
6. Bidirectional voice conversation works

## Known Issues & Limitations

### ESLint Warnings
- Unused parameters `_env` and `_ctx` in Durable Object constructors
- These are required by the interface, warnings can be ignored
- Consider updating ESLint config to allow underscore-prefixed unused params

### Current UI
- Using external Dyte meeting URL
- Not embedded in the app
- Will be replaced in Sprint 2

### AI Responses
- Basic interview questions
- No RAG integration yet
- No dynamic question generation based on JD/Resume
- Will be enhanced in Sprint 3

## Code Quality

### Cleanup Completed
- ✅ Removed unused `/agent/init` route
- ✅ Removed unused `handleJoinDashboardMeeting` function
- ✅ Fixed parameter naming conventions
- ✅ Added comprehensive logging

### Documentation
- ✅ Inline comments explaining critical sections
- ✅ Type definitions for all interfaces
- ✅ Clear function signatures

## Performance

### Agent Initialization Time
- ~20-22 seconds from meeting creation to agent ready
- Breakdown:
  - Meeting creation: ~1s
  - Agent initialization: ~20s (RealtimeKit pipeline setup)
  - Participant join: <1s

### Audio Latency
- STT latency: ~200-500ms (Deepgram)
- AI response: ~500ms (Workers AI)
- TTS latency: ~1-2s (ElevenLabs)
- Total round-trip: ~2-3s

## Dependencies

### External Services
- **Cloudflare RealtimeKit** - Meeting infrastructure
- **Deepgram** - Speech-to-text
- **ElevenLabs** - Text-to-speech
- **Workers AI** - Response generation (@cf/meta/llama-3.1-8b-instruct)

### NPM Packages
- `@cloudflare/realtime-agents` (v0.0.6)
- `@cloudflare/realtimekit` (v1.2.3)

## Environment Variables Required
```
ACCOUNT_ID=904dd3d810f6f1dd3801d8b940bd747a
REALTIME_APP_ID=9e2f9697-c855-4d0d-a4aa-acffbe42e291
REALTIME_PRESET_ID=a93306e0-b8d2-45e6-b88d-4055c4a2d70c
REALTIME_PRESET_NAME=group_call_host
API_TOKEN=<Cloudflare API token with Realtime Admin scope>
DEEPGRAM_API_KEY=<Deepgram API key>
ELEVENLABS_API_KEY=<ElevenLabs API key>
```

## Next Steps (Sprint 2+)

### Sprint 2: Modern UI
- Sleek off-white/dark grey/black theme
- Scenario selection interface
- JD/Resume upload with RAG extraction
- Persona customization (demeanor, difficulty)
- Embedded minimal meeting UI (mute/unmute, basic controls)
- Real-time insights/HUD panel for coaching
- End meeting workflow

### Sprint 3: RAG Pipeline
- Extract insights from JD/Resume
- Generate dynamic questions based on role requirements
- Context-aware follow-up questions

### Sprint 4: Final Report
- Post-interview analytics
- Detailed feedback and scoring
- Performance metrics
- Improvement recommendations

### Sprint 5: Polish
- Error handling improvements
- Edge case testing
- Production optimizations
- Security hardening

## Success Metrics

✅ **Sprint 1 Complete:**
- Agent joins meetings automatically
- Full STT/TTS pipeline working
- Bidirectional voice conversation
- AI generates contextual responses
- End-to-end flow tested and verified

**Time to Complete:** Multiple debugging iterations over several hours
**Key Breakthrough:** Understanding Durable Object RPC pattern and hostname-only URL format
