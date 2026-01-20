import { useState, useEffect, useRef } from 'react';
import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import * as RtkUI from '@cloudflare/realtimekit-react-ui';
import { createSession, createRoleplay, startMeeting, endMeeting } from '../../lib/api';
import type { SessionState } from '../../lib/types';
import { InsightsHUD } from './InsightsHUD';

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
  const [meeting, initMeeting] = useRealtimeKitClient();
  const initStarted = useRef(false);

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

  const handleEndMeeting = async () => {
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

  const initializeMeeting = async () => {
    try {
      setIsLoading(true);
      setError(null);

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

      // Start meeting and get auth token
      setLoadingMessage(`Connecting to ${session.persona?.interviewerName || 'your interviewer'}...`);
      const meetingResponse = await startMeeting(currentRoleplayId);
      
      if (!meetingResponse.success || !meetingResponse.data) {
        throw new Error(meetingResponse.error || 'Failed to start meeting');
      }

      // Store meetingId for InsightsHUD WebSocket connection
      setMeetingId(meetingResponse.data.meetingId);

      // Initialize RealtimeKit client with the auth token
      setLoadingMessage('Joining the interview room...');
      const meetingClient = await initMeeting({
        authToken: meetingResponse.data.authToken,
        defaults: {
          audio: true,
          video: false, // Audio-only for interview
        },
      });

      // Explicitly join the meeting room after initialization
      if (meetingClient) {
        await meetingClient.join();
        console.log('Successfully joined meeting room');
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize meeting');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h2 className="text-2xl font-bold">Preparing Your Interview</h2>
            <p className="text-[#9CA3AF] mt-2">{loadingMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-[#EF4444]/10 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Failed to Start Interview</h2>
            <p className="text-[#9CA3AF] mt-2">{error}</p>
          </div>
          <button
            onClick={() => {
              const currentRoleplayId = roleplayId || session.roleplayId;
              if (currentRoleplayId) {
                onEnd(currentRoleplayId);
              }
            }}
            className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render the embedded RealtimeKit meeting UI with Insights sidebar
  if (meeting) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col">
        {/* Header with end button */}
        <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-[#F5F5F5] text-xl font-bold">
              {session.scenario?.name || 'Interview'} Session
            </h1>
            <p className="text-[#9CA3AF] text-sm">
              with {session.persona?.interviewerName || 'AI Interviewer'} • {session.persona?.interviewerTitle || 'Interviewer'}
            </p>
          </div>
          <button
            onClick={handleEndMeeting}
            className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg font-medium transition-colors"
          >
            End Interview
          </button>
        </div>
        
        {/* Main content: Custom Meeting UI with Insights Sidebar */}
        <div className="flex-1 flex" style={{ height: 'calc(100vh - 80px)' }}>
          {/* Custom Meeting UI - wrapped in RtkUiProvider for context */}
          <RtkUiProvider
            meeting={meeting}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            {/* Participant Grid */}
            <RtkStage style={{ flex: 1 }}>
              <RtkGrid />
            </RtkStage>
            
            {/* Control Bar */}
            <RtkControlbar style={{ display: 'flex', justifyContent: 'center' }} />
            
            {/* Required hidden components for audio and dialogs */}
            <RtkParticipantsAudio />
            <RtkDialogManager />
            <RtkNotifications />
          </RtkUiProvider>
          
          {/* Insights HUD Sidebar */}
          <InsightsHUD
            meetingId={meetingId}
            duration={session.scenario?.duration || 15}
            interviewerName={session.persona?.interviewerName || 'Interviewer'}
            candidateName={session.persona?.candidateName || 'Candidate'}
          />
        </div>
      </div>
    );
  }

  return null;
}
