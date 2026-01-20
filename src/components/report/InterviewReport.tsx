import { useState } from 'react';
import type { InterviewReport as ReportType } from '../../lib/types';

interface InterviewReportProps {
  report: ReportType;
  onStartNewSession: () => void;
}

export function InterviewReport({ report, onStartNewSession }: InterviewReportProps) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    if (score >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-[#F5F5F5] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Interview Report</h1>
          <p className="text-[#9CA3AF]">
            {report.scenario.name} with {report.persona.interviewerName}
          </p>
          <p className="text-[#6B7280] text-sm mt-1">
            {report.persona.companyName} • Duration: {formatDuration(report.duration)}
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Overall Score</h2>
            <span className={`text-4xl font-bold ${getScoreColor(report.overallScore)}`}>
              {report.overallScore.toFixed(1)}/10
            </span>
          </div>
          <div className="w-full bg-[#2A2A2A] rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${getScoreBarColor(report.overallScore)}`}
              style={{ width: `${report.overallScore * 10}%` }}
            />
          </div>
        </div>

        {/* Category Scores */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-semibold mb-4">Category Scores</h2>
          <div className="space-y-4">
            {report.categoryScores.map((cat, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#E5E5E5]">{cat.category}</span>
                  <span className={`font-semibold ${getScoreColor(cat.score)}`}>
                    {cat.score}/10
                  </span>
                </div>
                <div className="w-full bg-[#2A2A2A] rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBarColor(cat.score)}`}
                    style={{ width: `${cat.score * 10}%` }}
                  />
                </div>
                <p className="text-[#9CA3AF] text-sm mt-1">{cat.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* STAR Analysis (for behavioral interviews) */}
        {report.starAnalysis && (
          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <h2 className="text-xl font-semibold mb-4">STAR Framework Analysis</h2>
            <div className="grid grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Situation', score: report.starAnalysis.situationScore },
                { label: 'Task', score: report.starAnalysis.taskScore },
                { label: 'Action', score: report.starAnalysis.actionScore },
                { label: 'Result', score: report.starAnalysis.resultScore },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                    {item.score}/10
                  </div>
                  <div className="text-[#9CA3AF] text-sm">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="text-[#9CA3AF] text-sm">{report.starAnalysis.feedback}</p>
          </div>
        )}

        {/* Strengths */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-400">✓</span> Strengths
          </h2>
          <ul className="space-y-2">
            {report.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span className="text-[#E5E5E5]">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-yellow-400">↗</span> Areas for Improvement
          </h2>
          <ul className="space-y-2">
            {report.areasForImprovement.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span className="text-[#E5E5E5]">{area}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actionable Tips */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-blue-400">💡</span> Actionable Tips
          </h2>
          <ol className="space-y-3">
            {report.actionableTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="bg-blue-500/20 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-[#E5E5E5]">{tip}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Summary */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
          <h2 className="text-xl font-semibold mb-4">Summary</h2>
          <p className="text-[#E5E5E5] leading-relaxed">{report.summary}</p>
        </div>

        {/* Transcript (Collapsible) */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">
          <button
            onClick={() => setTranscriptExpanded(!transcriptExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-[#252525] transition-colors"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-[#9CA3AF]">📝</span> Full Transcript
              <span className="text-[#6B7280] text-sm font-normal">
                ({report.transcript.length} messages)
              </span>
            </h2>
            <span className="text-[#9CA3AF] text-2xl">
              {transcriptExpanded ? '−' : '+'}
            </span>
          </button>
          
          {transcriptExpanded && (
            <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
              {report.transcript.length === 0 ? (
                <p className="text-[#6B7280] italic">No transcript available</p>
              ) : (
                report.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      entry.speaker === 'interviewer'
                        ? 'bg-[#2A2A2A]'
                        : 'bg-blue-500/10 border border-blue-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${
                        entry.speaker === 'interviewer' ? 'text-[#9CA3AF]' : 'text-blue-400'
                      }`}>
                        {entry.speakerName}
                      </span>
                      <span className="text-[#6B7280] text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[#E5E5E5] text-sm">{entry.text}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Start New Session Button */}
        <div className="text-center pt-4">
          <button
            onClick={onStartNewSession}
            className="px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl font-semibold text-lg transition-colors"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}
