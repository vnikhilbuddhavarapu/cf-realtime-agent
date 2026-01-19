import { useState, useEffect } from 'react';

interface InsightsHUDProps {
  duration: number;
}

export function InsightsHUD({ duration }: InsightsHUDProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60);
  const [transcription] = useState<string[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-96 border-l border-[#2A2A2A] bg-[#0F0F0F] flex flex-col">
      {/* HUD Header */}
      <div className="border-b border-[#2A2A2A] p-4">
        <h3 className="text-lg font-semibold mb-3">Real-Time Insights</h3>
        
        {/* Time Remaining */}
        <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#9CA3AF]">Time Remaining</span>
            <span className="text-xl font-bold text-[#3B82F6]">{formatTime(timeRemaining)}</span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-2">
            <div
              className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] h-2 rounded-full transition-all"
              style={{ width: `${(timeRemaining / (duration * 60)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="border-b border-[#2A2A2A] p-4 space-y-3">
        <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Confidence</span>
            <span className="text-sm font-semibold text-[#10B981]">Good</span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-1.5 mt-2">
            <div className="bg-[#10B981] h-1.5 rounded-full" style={{ width: '70%' }} />
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#9CA3AF]">Clarity</span>
            <span className="text-sm font-semibold text-[#3B82F6]">Excellent</span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-1.5 mt-2">
            <div className="bg-[#3B82F6] h-1.5 rounded-full" style={{ width: '85%' }} />
          </div>
        </div>
      </div>

      {/* Live Transcription */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <h4 className="text-sm font-semibold text-[#9CA3AF] mb-3">Live Transcription</h4>
        <div className="flex-1 bg-[#1a1a1a] border border-[#2A2A2A] rounded-lg p-3 overflow-y-auto space-y-2">
          {transcription.length === 0 ? (
            <div className="text-sm text-[#6B7280] italic">
              Transcription will appear here during the interview...
            </div>
          ) : (
            transcription.map((text, i) => (
              <div key={i} className="text-sm text-[#F5F5F5]">
                {text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Tips */}
      <div className="border-t border-[#2A2A2A] p-4">
        <h4 className="text-sm font-semibold text-[#9CA3AF] mb-2">Quick Tips</h4>
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-[#9CA3AF]">
            <svg className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Speak clearly and at a steady pace</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-[#9CA3AF]">
            <svg className="w-4 h-4 text-[#3B82F6] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Take your time to think before answering</span>
          </div>
        </div>
      </div>
    </div>
  );
}
