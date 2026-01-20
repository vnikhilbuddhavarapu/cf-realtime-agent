# Sprint 2: Embedded RealtimeKit UI + TTS Fix ✅

## Objective
Embed the Cloudflare RealtimeKit UI directly into our React app (SPA style) instead of redirecting to an external URL, and fix the ElevenLabs TTS audio that wasn't working in the embedded experience.

## What We Built

### Core Achievement
- **Embedded Meeting UI**: Users now stay within our app during interviews - no external redirects
- **Working TTS Pipeline**: ElevenLabs TTS audio now plays correctly when the AI agent speaks
- **Full Voice Loop**: STT → AI → TTS pipeline working end-to-end in production

### Key Components Modified

1. **MeetingRoom.tsx** - Complete rewrite
   - Replaced `window.location.href` redirect with embedded `RtkMeeting` component
   - Uses `useRealtimeKitClient` hook from `@cloudflare/realtimekit-react`
   - Explicit `meeting.join()` call after initialization
   - Proper error handling and loading states
   - Location: `src/components/meeting/MeetingRoom.tsx`

2. **InterviewAgent.ts** - Simplified to match docs pattern
   - Removed complex socket waiting logic
   - Simplified event handlers (no async, no delays)
   - Added WebSocket readiness check for TextProcessor
   - Removed custom media filters from RealtimeKitTransport
   - Location: `worker/agents/InterviewAgent.ts`

3. **Type Declarations** - New file
   - Added TypeScript declarations for RealtimeKit packages
   - Location: `src/types/realtimekit.d.ts`

## Critical Discovery: Local Dev Limitation

### The Problem
TTS audio was not working in local development (`npm run dev`).

### Root Cause
The Realtime Agents pipeline backend (`agents.realtime.cloudflare.com`) needs to call back to your worker at `/agentsInternal` routes to send TTS audio:

```
Pipeline Backend (agents.realtime.cloudflare.com)
       ↓
   Tries to call: localhost:5174/agentsInternal?meetingId=xxx
       ↓
   FAILS - Cloudflare's servers cannot reach localhost!
```

### Solution
**Deploy to Cloudflare** - TTS only works in production because the `workerHost` becomes your actual `*.workers.dev` URL that the pipeline backend can reach.

| Environment | TTS Works? | Reason |
|-------------|------------|--------|
| Local Dev (`localhost:5174`) | ❌ No | Pipeline backend can't reach localhost |
| Deployed (`*.workers.dev`) | ✅ Yes | Pipeline backend can reach your worker |

## Technical Details

### Frontend Integration Pattern
```typescript
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';

function MeetingRoom() {
  const [meeting, initMeeting] = useRealtimeKitClient();

  // Initialize and join
  const meetingClient = await initMeeting({
    authToken: response.data.authToken,
    defaults: { audio: true, video: false },
  });
  await meetingClient.join(); // Explicit join required!

  // Render embedded UI
  return <RtkMeeting meeting={meeting} />;
}
```

### Agent Pattern (Simplified)
```typescript
// Match docs pattern exactly - simple, synchronous handlers
meeting.participants.joined.on("participantJoined", (participant) => {
  textProcessor.speak(`Hello! Welcome to your interview.`);
});

// Join after registering handlers
await meeting.join();
```

### Pipeline Flow (Production)
```
1. User joins meeting via embedded RtkMeeting
2. Agent detects participantJoined event
3. Agent calls textProcessor.speak("greeting")
4. TextProcessor sends text via WebSocket to pipeline backend
5. Pipeline backend calls ElevenLabs TTS API
6. Pipeline backend sends audio back via /agentsInternal/produce
7. Audio plays in user's meeting
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/meeting/MeetingRoom.tsx` | Complete rewrite - embedded RTK UI |
| `src/types/realtimekit.d.ts` | New - TypeScript declarations |
| `src/components/meeting/InsightsHUD.tsx` | Minor fix - unused variable |
| `worker/agents/InterviewAgent.ts` | Simplified to match docs pattern |

## Dependencies Used

```json
{
  "@cloudflare/realtimekit": "^0.x.x",
  "@cloudflare/realtimekit-react": "^0.x.x",
  "@cloudflare/realtimekit-react-ui": "^0.x.x",
  "@cloudflare/realtime-agents": "^0.x.x"
}
```

## Deployment

```bash
npm run deploy
# Deploys to: https://realtime-voice-agent.acme-corp.workers.dev
```

## Verified Working Features

- ✅ Session creation
- ✅ Roleplay creation with scenario/persona
- ✅ Meeting creation via RealtimeKit API
- ✅ Agent joins meeting automatically
- ✅ Embedded meeting UI (no redirects)
- ✅ Participant join detection
- ✅ TTS greeting on participant join
- ✅ STT transcription (Deepgram)
- ✅ AI response generation (Workers AI - Llama 3.1)
- ✅ TTS response playback (ElevenLabs)
- ✅ Bidirectional voice conversation

## Lessons Learned

1. **Always deploy to test TTS** - Local dev cannot work with Realtime Agents pipeline
2. **Match docs patterns exactly** - The SDK examples are minimal for a reason
3. **Explicit join() required** - `initMeeting()` doesn't auto-join the room
4. **WebSocket readiness matters** - TextProcessor WS must be OPEN before speak()
5. **Keep agent init simple** - Complex async logic in event handlers causes issues

## Next Steps (Sprint 3+)

1. **RAG Integration** - Job description and resume context
2. **Knowledge Base** - STAR framework, interview techniques
3. **Real-time Insights** - Coaching feedback during interview
4. **Final Report** - Post-interview analysis and scoring
5. **MVP Polish** - Error handling, UX improvements, hardening

---

*Sprint 2 completed: January 19, 2026*
*Deployed URL: https://realtime-voice-agent.acme-corp.workers.dev*
