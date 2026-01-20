import { useState, useEffect, useRef, useCallback } from 'react';
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  Clock,
  Lightbulb,
  Mic,
  RefreshCcw,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { Badge } from "../ui/Badge";
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
  timeRemainingSeconds?: number;
  interviewerName: string;
  candidateName: string;
}

const INSIGHT_TYPE_CONFIG: Record<
  string,
  {
    Icon: LucideIcon;
    itemClassName: string;
    iconClassName: string;
    textClassName: string;
  }
> = {
  framework: {
    Icon: Target,
    itemClassName: "border-zinc-800 bg-zinc-950/40",
    iconClassName: "text-zinc-200",
    textClassName: "text-zinc-200",
  },
  resume_highlight: {
    Icon: Sparkles,
    itemClassName: "border-emerald-500/20 bg-emerald-500/10",
    iconClassName: "text-emerald-200",
    textClassName: "text-emerald-100",
  },
  question_guidance: {
    Icon: Lightbulb,
    itemClassName: "border-amber-500/20 bg-amber-500/10",
    iconClassName: "text-amber-200",
    textClassName: "text-amber-100",
  },
  recovery: {
    Icon: RefreshCcw,
    itemClassName: "border-orange-500/20 bg-orange-500/10",
    iconClassName: "text-orange-200",
    textClassName: "text-orange-100",
  },
  positive: {
    Icon: Sparkles,
    itemClassName: "border-zinc-700 bg-zinc-900/40",
    iconClassName: "text-zinc-200",
    textClassName: "text-zinc-200",
  },
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  behavioral: 'Behavioral',
  technical: 'Technical',
  situational: 'Situational',
  competency: 'Competency',
  motivation: 'Motivation',
  unknown: 'General',
};

export function InsightsHUD({ meetingId, duration, timeRemainingSeconds, interviewerName, candidateName }: InsightsHUDProps) {
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

  const displayedTimeRemaining =
    typeof timeRemainingSeconds === "number" ? timeRemainingSeconds : timeRemaining;

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
    if (typeof timeRemainingSeconds === "number") return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemainingSeconds]);

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
    <div className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950/60 backdrop-blur flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-zinc-200" />
            Live coaching
            {wsConnected && (
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            )}
          </h3>
          <span className="text-base font-semibold tabular-nums text-zinc-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            {formatTime(displayedTimeRemaining)}
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1">
          <div
            className="bg-zinc-200 h-1 rounded-full transition-all"
            style={{ width: `${(displayedTimeRemaining / (duration * 60)) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Type Badge */}
      {questionType !== 'unknown' && (
        <div className="px-4 pt-4">
          <Badge variant="subtle">
            Question
            <span className="text-zinc-500">:</span>
            <span className="text-zinc-200">{QUESTION_TYPE_LABELS[questionType]}</span>
          </Badge>
        </div>
      )}

      {/* STAR Progress (only for behavioral questions) */}
      {questionType === 'behavioral' && (
        <div className="border-b border-zinc-800 p-4">
          <div className="text-xs text-zinc-400 mb-2">STAR framework progress</div>
          <div className="flex gap-1">
            {starComponents.map((component, index) => {
              const isComplete = starProgress[component.key];
              const isCurrent = index === currentStarIndex;
              return (
                <div
                  key={component.key}
                  className={`flex-1 flex flex-col items-center p-2 rounded-lg transition-all ${
                    isComplete
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : isCurrent
                      ? 'bg-zinc-50/10 border border-zinc-50/20 animate-pulse'
                      : 'bg-zinc-950/40 border border-zinc-800'
                  }`}
                >
                  <span
                    className={`text-lg font-bold ${
                      isComplete ? 'text-emerald-200' : isCurrent ? 'text-zinc-100' : 'text-zinc-500'
                    }`}
                  >
                    {isComplete ? '✓' : component.label}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">{component.full}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Coaching Insights */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 pt-4 pb-2">
          <h4 className="text-xs font-semibold text-zinc-400">Coaching tips</h4>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {insights.length === 0 ? (
            <div className="text-xs text-zinc-500 italic p-2">
              Tips will appear as you speak...
            </div>
          ) : (
            insights.slice(-5).map((insight) => {
              const config = INSIGHT_TYPE_CONFIG[insight.type];
              return (
                <div
                  key={insight.id}
                  className={`p-3 rounded-xl border ${config.itemClassName} animate-fade-in`}
                >
                  <div className="flex items-start gap-2">
                    <config.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.iconClassName}`} />
                    <p className={`text-xs leading-relaxed ${config.textClassName}`}>
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
      <div className="border-t border-zinc-800">
        <button
          onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-xs text-zinc-400 hover:bg-zinc-900/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Transcript
            {transcript.length > 0 && (
              <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-200">
                {transcript.length}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isTranscriptExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isTranscriptExpanded && (
          <div className="max-h-48 overflow-y-auto px-4 pb-4 space-y-3">
            {transcript.length === 0 ? (
              <div className="text-xs text-zinc-500 italic">
                Conversation will appear here...
              </div>
            ) : (
              transcript.map((entry) => (
                <div key={entry.id} className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    {entry.speaker === 'interviewer' ? (
                      <Mic className="h-3.5 w-3.5 text-zinc-300" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-zinc-300" />
                    )}
                    <span className="font-medium text-zinc-300">
                      {entry.speaker === 'interviewer' ? interviewerName : candidateName}
                    </span>
                  </div>
                  <p className="text-zinc-200 pl-6 leading-relaxed">{entry.text}</p>
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
