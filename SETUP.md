# Setup Guide - AI Interview Prep App

## Prerequisites

Before you can test the RealtimeKit integration, you need to set up a **RealtimeKit App** in the Cloudflare dashboard.

## Step 1: Create a RealtimeKit App

1. Go to the [Cloudflare RealtimeKit Dashboard](https://dash.cloudflare.com/?to=/:account/realtime/kit)
2. Click **"Create App"** or **"New App"**
3. Give your app a name (e.g., "AI Interview Prep")
4. Copy the **App ID** that is generated

## Step 2: Configure Environment Variables

Add the RealtimeKit App ID to your `.dev.vars` file:

```bash
# In .dev.vars file
REALTIME_APP_ID=your_app_id_here  # Replace with the App ID from step 1
```

Your complete `.dev.vars` should look like:

```bash
# Cloudflare Account Configuration
ACCOUNT_ID=904dd3d810f6f1dd3801d8b940bd747a
API_TOKEN=jtslemHYPyZoF20e87ddsm-bE7OOohRwq259oCLK
REALTIME_APP_ID=your_app_id_here  # ← ADD THIS

# Speech-to-Text (Deepgram)
DEEPGRAM_API_KEY=75dd3d2f3ce3b6cee6614a7f8230a89e4b269efa

# Text-to-Speech (ElevenLabs)
ELEVENLABS_API_KEY=sk_0c3f03dbae8c7ef9cda5430e99aa062a707faa87652c339a
```

## Step 3: Restart the Dev Server

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

## Step 4: Test the Flow

1. Open http://localhost:5173
2. Click **"Create Session"** ✅
3. Click **"Create Technical Interview Roleplay"** ✅
4. Click **"Start Meeting"** ✅ (should now work!)
5. Click **"Join Meeting →"** to open the RealtimeKit interface
6. Talk to the AI interviewer!

## What We Fixed

### Issue 1: Session Not Found ✅ FIXED
- **Problem**: Each API call was creating a new Durable Object instance
- **Solution**: Now using a single global `SessionManager` with ID `"global-session-manager"`

### Issue 2: Meeting Initialization Error ✅ FIXED
- **Problem**: Using fake meeting IDs and tokens (`crypto.randomUUID()` and `temp_token_${meetingId}`)
- **Solution**: Now using the **Cloudflare Calls API** to create real RealtimeKit meetings with proper authentication

## How It Works Now

When you click "Start Meeting":

1. **Creates Real Meeting**: Calls `POST /api/cloudflare.com/.../meetings` to create an actual RealtimeKit meeting
2. **Adds Participant**: Calls `POST /api/cloudflare.com/.../participants` to add the AI agent and get an auth token
3. **Initializes Agent**: The `InterviewAgent` Durable Object joins the meeting using the real meeting ID and auth token
4. **Ready to Chat**: You can now join the meeting and talk to the AI!

## Architecture

```
User clicks "Start Meeting"
    ↓
Worker API: handleStartMeeting()
    ↓
createRealtimeKitMeeting() → Cloudflare Calls API
    ├─ POST /meetings (creates meeting)
    └─ POST /meetings/{id}/participants (gets auth token)
    ↓
InterviewAgent.init()
    ├─ DeepgramSTT (speech → text)
    ├─ Workers AI (text → AI response)
    ├─ ElevenLabsTTS (AI response → speech)
    └─ RealtimeKitTransport (joins meeting)
    ↓
User joins meeting via RealtimeKit link
    ↓
Real-time voice conversation! 🎉
```

## Troubleshooting

### Error: "REALTIME_APP_ID is not defined"
- Make sure you added `REALTIME_APP_ID` to `.dev.vars`
- Restart the dev server after adding it

### Error: "Failed to create RealtimeKit meeting"
- Check that your `API_TOKEN` has **Realtime** permissions
- Verify your `ACCOUNT_ID` is correct
- Make sure the `REALTIME_APP_ID` is valid

### Error: "Failed to add participant"
- This usually means the meeting was created but participant addition failed
- Check the API token permissions again

## Next Steps

Once the meeting works, we can add:
- Custom interview scenarios
- Job description & resume upload
- Real-time coaching and feedback
- STAR framework integration
- Post-interview report generation
