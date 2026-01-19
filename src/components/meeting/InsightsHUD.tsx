import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  Insight,
  TranscriptEntry,
  STARProgress,
  QuestionType,
  InsightsWSMessage,
} from '../../lib/types';

interface InsightsHUDProps {
  meetingId: string | null;
  duration: number;
  interviewerName: string;
  candidateName: string;
}

const INSIGHT_TYPE_CONFIG = {
  framework: { icon: '🎯', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  resume_highlight: { icon: '📄', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  question_guidance: { icon: '💡', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  recovery: { icon: '🔄', color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  positive: { icon: '✨', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  situational: 'Situational',
  competency: 'Competency',
  motivation: 'Motivation',
  unknown: 'General',
};

export function InsightsHUD({ meetingId, duration, interviewerName, candidateName }: InsightsHUDProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [starProgress, setStarProgress] = useState<STARProgress>({
    situation: false,
    task: false,
    action: false,
    result: false,
  });
  const [questionType, setQuestionType] = useState<QuestionType>('unknown');
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const insightsEndRef = useRef<HTMLDivElement>(null);

  // Connect to insights WebSocket
  useEffect(() => {
    if (!meetingId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/insights/ws?meetingId=${meetingId}`;
    
    console.log('[InsightsHUD] Connecting to WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[InsightsHUD] WebSocket connected');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: InsightsWSMessage = JSON.parse(event.data);
        console.log('[InsightsHUD] Received message:', message.type);

        switch (message.type) {
          case 'insight':
            setInsights(prev => [...prev, message.data]);
            break;
          case 'transcript':
            setTranscript(prev => [...prev, message.data]);
            break;
          case 'star_progress':
            setStarProgress(message.data);
            break;
          case 'question_type':
            setQuestionType(message.data);
            break;
          case 'connected':
            console.log('[InsightsHUD] Connected to roleplay:', message.roleplayId);
            break;
          case 'error':
            console.error('[InsightsHUD] Error:', message.message);
            break;
        }
      } catch (err) {
        console.error('[InsightsHUD] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[InsightsHUD] WebSocket disconnected');
      setWsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('[InsightsHUD] WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [meetingId]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (isTranscriptExpanded) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, isTranscriptExpanded]);

  // Auto-scroll insights
  useEffect(() => {
    insightsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [insights]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const starComponents = [
    { key: 'situation', label: 'S', full: 'Situation' },
    { key: 'task', label: 'T', full: 'Task' },
    { key: 'action', label: 'A', full: 'Action' },
    { key: 'result', label: 'R', full: 'Result' },
  ] as const;

  const currentStarIndex = starComponents.findIndex(
    (c) => !starProgress[c.key]
  );

  return (
    <div className="w-80 border-l border-[#2A2A2A] bg-[#0F0F0F] flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            💡 Live Coaching
            {wsConnected && (
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </h3>
          <span className="text-lg font-bold text-[#3B82F6]">{formatTime(timeRemaining)}</span>
        </div>
        <div className="w-full bg-[#2A2A2A] rounded-full h-1">
          <div
            className="bg-linear-to-r from-[#3B82F6] to-[#2563EB] h-1 rounded-full transition-all"
            style={{ width: `${(timeRemaining / (duration * 60)) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Type Badge */}
      {questionType !== 'unknown' && (
        <div className="px-3 pt-3">
          <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#1a1a1a] border border-[#2A2A2A] rounded-full text-xs">
            <span className="text-[#9CA3AF]">Question:</span>
            <span className="font-medium text-[#3B82F6]">{QUESTION_TYPE_LABELS[questionType]}</span>
          </div>
        </div>
      )}

      {/* STAR Progress (only for behavioral questions) */}
      {questionType === 'behavioral' && (
        <div className="border-b border-[#2A2A2A] p-3">
          <div className="text-xs text-[#9CA3AF] mb-2">STAR Framework Progress</div>
          <div className="flex gap-1">
            {starComponents.map((component, index) => {
              const isComplete = starProgress[component.key];
              const isCurrent = index === currentStarIndex;
              return (
                <div
                  key={component.key}
                  className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${
                    isComplete
                      ? 'bg-green-500/20 border border-green-500/40'
                      : isCurrent
                      ? 'bg-blue-500/20 border border-blue-500/40 animate-pulse'
                      : 'bg-[#1a1a1a] border border-[#2A2A2A]'
                  }`}
                >
                  <span
                    className={`text-lg font-bold ${
                      isComplete ? 'text-green-400' : isCurrent ? 'text-blue-400' : 'text-[#6B7280]'
                    }`}
                  >
                    {isComplete ? '✓' : component.label}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] mt-0.5">{component.full}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Coaching Insights */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-3 pt-3 pb-1">
          <h4 className="text-xs font-semibold text-[#9CA3AF]">Coaching Tips</h4>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {insights.length === 0 ? (
            <div className="text-xs text-[#6B7280] italic p-2">
              Tips will appear as you speak...
            </div>
          ) : (
            insights.slice(-5).map((insight) => {
              const config = INSIGHT_TYPE_CONFIG[insight.type];
              return (
                <div
                  key={insight.id}
                  className={`p-2 rounded-lg border ${config.bgColor} ${config.borderColor} animate-fade-in`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base">{config.icon}</span>
                    <p className={`text-xs ${config.color} leading-relaxed`}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={insightsEndRef} />
        </div>
      </div>

      {/* Collapsible Transcript */}
      <div className="border-t border-[#2A2A2A]">
        <button
          onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs text-[#9CA3AF] hover:bg-[#1a1a1a] transition-colors"
        >
          <span className="flex items-center gap-2">
            📝 Transcript
            {transcript.length > 0 && (
              <span className="px-1.5 py-0.5 bg-[#2A2A2A] rounded text-[10px]">
                {transcript.length}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 transition-transform ${isTranscriptExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>

        {isTranscriptExpanded && (
          <div className="max-h-48 overflow-y-auto px-3 pb-3 space-y-2">
            {transcript.length === 0 ? (
              <div className="text-xs text-[#6B7280] italic">
                Conversation will appear here...
              </div>
            ) : (
              transcript.map((entry) => (
                <div key={entry.id} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={entry.speaker === 'interviewer' ? 'text-blue-400' : 'text-green-400'}>
                      {entry.speaker === 'interviewer' ? '🎤' : '👤'}
                    </span>
                    <span className="font-medium text-[#9CA3AF]">
                      {entry.speaker === 'interviewer' ? interviewerName : candidateName}
                    </span>
                  </div>
                  <p className="text-[#F5F5F5] pl-5 leading-relaxed">
                    {entry.text}
                  </p>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
