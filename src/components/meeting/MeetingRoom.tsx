import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import * as RtkUI from '@cloudflare/realtimekit-react-ui';
import { createSession, createRoleplay, startMeeting, endMeeting, getMeetingReady } from '../../lib/api';
import type { SessionState } from '../../lib/types';
import { InsightsHUD } from './InsightsHUD';
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";

// RTK UI Kit components - types not fully exported but components exist at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkUiProvider = (RtkUI as unknown as Record<string, any>).RtkUiProvider;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkStage = (RtkUI as unknown as Record<string, any>).RtkStage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkGrid = (RtkUI as unknown as Record<string, any>).RtkGrid;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkControlbar = (RtkUI as unknown as Record<string, any>).RtkControlbar;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkParticipantsAudio = (RtkUI as unknown as Record<string, any>).RtkParticipantsAudio;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkDialogManager = (RtkUI as unknown as Record<string, any>).RtkDialogManager;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RtkNotifications = (RtkUI as unknown as Record<string, any>).RtkNotifications;

interface MeetingRoomProps {
  session: SessionState;
  onEnd: (roleplayId: string) => void;
}

export function MeetingRoom({ session, onEnd }: MeetingRoomProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Setting up your interview...');
  const [error, setError] = useState<string | null>(null);
  const [roleplayId, setRoleplayId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [meetingAuthToken, setMeetingAuthToken] = useState<string | null>(null);
  const [meetingStartMs, setMeetingStartMs] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [meeting, initMeeting] = useRealtimeKitClient();
  const initStarted = useRef(false);
  const endStartedRef = useRef(false);
  const autoLeaveScheduledRef = useRef(false);
  const autoLeaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    initializeMeeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle meeting end
  useEffect(() => {
    if (!meeting) return;

    const handleMeetingEnd = () => {
      handleEndMeeting();
    };

    // Listen for meeting left event
    meeting.self.on('roomLeft', handleMeetingEnd);

    return () => {
      meeting.self.off('roomLeft', handleMeetingEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting]);

  useEffect(() => {
    return () => {
      if (autoLeaveTimeoutRef.current) {
        clearTimeout(autoLeaveTimeoutRef.current);
        autoLeaveTimeoutRef.current = null;
      }
    };
  }, []);

  const handleEndMeeting = async () => {
    if (endStartedRef.current) return;
    endStartedRef.current = true;

    if (autoLeaveTimeoutRef.current) {
      clearTimeout(autoLeaveTimeoutRef.current);
      autoLeaveTimeoutRef.current = null;
    }

    const currentRoleplayId = roleplayId || session.roleplayId;
    if (currentRoleplayId) {
      try {
        await endMeeting(currentRoleplayId);
      } catch (err) {
        console.error('Failed to end meeting:', err);
      }
      onEnd(currentRoleplayId);
    }
  };

  useEffect(() => {
    if (!meetingStartMs) return;

    const durationMinutes = session.scenario?.duration || 15;
    const totalSeconds = durationMinutes * 60;

    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - meetingStartMs) / 1000);
      setTimeRemainingSeconds(Math.max(0, totalSeconds - elapsedSeconds));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [meetingStartMs, session.scenario?.duration]);

  useEffect(() => {
    if (!meeting) return;
    if (typeof timeRemainingSeconds !== "number") return;
    if (timeRemainingSeconds > 0) return;
    if (autoLeaveScheduledRef.current) return;

    autoLeaveScheduledRef.current = true;
    autoLeaveTimeoutRef.current = setTimeout(() => {
      meeting.leave().catch((err) => {
        console.error('Failed to auto-leave meeting:', err);
      });
    }, 30_000);
  }, [meeting, timeRemainingSeconds]);

  const initializeMeeting = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

      const waitForAgentReady = async (meetingId: string) => {
        const start = Date.now();
        const timeoutMs = 30000;
        while (Date.now() - start < timeoutMs) {
          try {
            const readyResponse = await getMeetingReady(meetingId);
            if (readyResponse.success && readyResponse.data?.ready) {
              return true;
            }
          } catch (err) {
            console.warn('Failed to check agent readiness, will retry:', err);
          }
          await sleep(250);
        }
        return false;
      };

      // Use existing roleplayId if available (from preparation step), otherwise create new
      let currentRoleplayId = session.roleplayId;
      
      if (!currentRoleplayId) {
        // Fallback: Create session and roleplay if not already created
        setLoadingMessage('Creating session...');
        const sessionResponse = await createSession();
        if (!sessionResponse.success || !sessionResponse.data) {
          throw new Error(sessionResponse.error || 'Failed to create session');
        }
        const sessionId = sessionResponse.data.sessionId;

        setLoadingMessage('Configuring your interviewer...');
        const roleplayResponse = await createRoleplay(
          sessionId,
          session.scenario!,
          session.persona!
        );
        if (!roleplayResponse.success || !roleplayResponse.data) {
          throw new Error(roleplayResponse.error || 'Failed to create roleplay');
        }
        currentRoleplayId = roleplayResponse.data.roleplayId;
      }
      
      setRoleplayId(currentRoleplayId);

      let currentMeetingId = meetingId;
      let currentMeetingAuthToken = meetingAuthToken;

      if (!currentMeetingId || !currentMeetingAuthToken) {
        // Start meeting and get auth token
        setLoadingMessage(`Connecting to ${session.persona?.interviewerName || 'your interviewer'}...`);
        const meetingResponse = await startMeeting(currentRoleplayId);
        
        if (!meetingResponse.success || !meetingResponse.data) {
          throw new Error(meetingResponse.error || 'Failed to start meeting');
        }

        currentMeetingId = meetingResponse.data.meetingId;
        currentMeetingAuthToken = meetingResponse.data.authToken;

        // Store meetingId/auth token for InsightsHUD WS connection and retry attempts
        setMeetingId(currentMeetingId);
        setMeetingAuthToken(currentMeetingAuthToken);
      }

      setLoadingMessage('Waiting for interviewer to get ready...');
      const isAgentReady = await waitForAgentReady(currentMeetingId);
      if (!isAgentReady) {
        throw new Error('Interviewer is still getting ready. Please retry in a few seconds.');
      }

      // Initialize RealtimeKit client with the auth token
      setLoadingMessage('Joining the interview room...');
      const meetingClient = await initMeeting({
        authToken: currentMeetingAuthToken,
        defaults: {
          audio: true,
          video: false, // Audio-only for interview
        },
      });

      // Explicitly join the meeting room after initialization
      if (meetingClient) {
        await meetingClient.join();
        console.log('Successfully joined meeting room');
        setMeetingStartMs(Date.now());
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize meeting');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Preparing your interview</CardTitle>
            <CardDescription>{loadingMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-14 w-14 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-200" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-300" />
              Failed to start interview
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end gap-2">
            <Button
              onClick={() => {
                initializeMeeting();
              }}
              variant="secondary"
            >
              Retry
            </Button>
            <Button
              onClick={() => {
                const currentRoleplayId = roleplayId || session.roleplayId;
                if (currentRoleplayId) {
                  onEnd(currentRoleplayId);
                }
              }}
              variant="secondary"
            >
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the embedded RealtimeKit meeting UI with Insights sidebar
  if (meeting) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <div className="bg-zinc-950/70 border-b border-zinc-800 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
          <div>
            <h1 className="text-zinc-50 text-xl font-semibold tracking-tight">
              {session.scenario?.name || 'Interview'} session
            </h1>
            <p className="text-zinc-400 text-sm">
              with {session.persona?.interviewerName || 'AI interviewer'} • {session.persona?.interviewerTitle || 'Interviewer'}
            </p>
          </div>
        </div>
        
        {/* Main content: Custom Meeting UI with Insights Sidebar */}
        <div className="flex-1 flex min-h-0" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="flex-1 p-4 min-h-0">
            <div className="rtk-theme h-full rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <RtkUiProvider
                meeting={meeting}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                }}
              >
                <RtkStage style={{ flex: 1 }}>
                  <RtkGrid />
                </RtkStage>
                <RtkControlbar style={{ display: 'flex', justifyContent: 'center' }} />
                <RtkParticipantsAudio />
                <RtkDialogManager />
                <RtkNotifications />
              </RtkUiProvider>
            </div>
          </div>
          
          {/* Insights HUD Sidebar */}
          <InsightsHUD
            meetingId={meetingId}
            duration={session.scenario?.duration || 15}
            timeRemainingSeconds={typeof timeRemainingSeconds === "number" ? timeRemainingSeconds : undefined}
            interviewerName={session.persona?.interviewerName || 'Interviewer'}
            candidateName={session.persona?.candidateName || 'Candidate'}
          />
        </div>
      </div>
    );
  }

  return null;
}
