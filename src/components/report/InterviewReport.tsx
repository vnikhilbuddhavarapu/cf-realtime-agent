import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import type { InterviewReport as ReportType } from '../../lib/types';
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";

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
    if (score >= 8) return 'text-emerald-300';
    if (score >= 6) return 'text-amber-300';
    if (score >= 4) return 'text-orange-300';
    return 'text-red-300';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 8) return 'bg-emerald-500/70';
    if (score >= 6) return 'bg-amber-500/70';
    if (score >= 4) return 'bg-orange-500/70';
    return 'bg-red-500/70';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Interview report</h1>
          <p className="text-zinc-400">
            {report.scenario.name} with {report.persona.interviewerName}
          </p>
          <p className="text-zinc-500 text-sm">
            {report.persona.companyName} • Duration: {formatDuration(report.duration)}
          </p>
        </div>

        {/* Overall Score */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-6">
              <div>
                <CardTitle>Overall score</CardTitle>
                <CardDescription>Summary of your interview performance.</CardDescription>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-semibold ${getScoreColor(report.overallScore)}`}>
                  {report.overallScore.toFixed(1)}
                </div>
                <div className="text-xs text-zinc-500">out of 10</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getScoreBarColor(report.overallScore)}`}
                style={{ width: `${report.overallScore * 10}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Category scores</CardTitle>
            <CardDescription>Breakdown across key evaluation areas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.categoryScores.map((cat, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-200">{cat.category}</span>
                  <span className={`font-semibold ${getScoreColor(cat.score)}`}>
                    {cat.score}/10
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getScoreBarColor(cat.score)}`}
                    style={{ width: `${cat.score * 10}%` }}
                  />
                </div>
                <p className="text-zinc-400 text-sm mt-1">{cat.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* STAR Analysis (for behavioral interviews) */}
        {report.starAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle>STAR framework analysis</CardTitle>
              <CardDescription>How complete your STAR answers were.</CardDescription>
            </CardHeader>
            <CardContent>
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
                  <div className="text-zinc-400 text-sm">{item.label}</div>
                </div>
              ))}
            </div>
              <p className="text-zinc-400 text-sm">{report.starAnalysis.feedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
          <ul className="space-y-2">
            {report.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-zinc-300 mt-1">•</span>
                <span className="text-zinc-200">{strength}</span>
              </li>
            ))}
          </ul>
          </CardContent>
        </Card>

        {/* Areas for Improvement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              Areas for improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
          <ul className="space-y-2">
            {report.areasForImprovement.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-zinc-300 mt-1">•</span>
                <span className="text-zinc-200">{area}</span>
              </li>
            ))}
          </ul>
          </CardContent>
        </Card>

        {/* Actionable Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-zinc-200" />
              Actionable tips
            </CardTitle>
          </CardHeader>
          <CardContent>
          <ol className="space-y-3">
            {report.actionableTips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="bg-zinc-50/10 text-zinc-200 border border-zinc-800 rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shrink-0">
                  {idx + 1}
                </span>
                <span className="text-zinc-200">{tip}</span>
              </li>
            ))}
          </ol>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>A concise narrative of how you did.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-200 leading-relaxed">{report.summary}</p>
          </CardContent>
        </Card>

        {/* Transcript (Collapsible) */}
        <Card className="overflow-hidden">
          <button
            onClick={() => setTranscriptExpanded(!transcriptExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-zinc-900/40 transition-colors"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-zinc-300" />
              Full transcript
              <span className="text-zinc-500 text-sm font-normal">
                ({report.transcript.length} messages)
              </span>
            </h2>
            {transcriptExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </button>
          
          {transcriptExpanded && (
            <div className="px-6 pb-6 space-y-3 max-h-96 overflow-y-auto">
              {report.transcript.length === 0 ? (
                <p className="text-zinc-500 italic">No transcript available</p>
              ) : (
                report.transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border ${
                      entry.speaker === 'interviewer'
                        ? 'bg-zinc-950/40 border-zinc-800'
                        : 'bg-zinc-900/50 border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-semibold ${
                        entry.speaker === 'interviewer' ? 'text-zinc-300' : 'text-zinc-100'
                      }`}>
                        {entry.speakerName}
                      </span>
                      <span className="text-zinc-500 text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-zinc-200 text-sm">{entry.text}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>

        {/* Start New Session Button */}
        <div className="text-center pt-4">
          <Button onClick={onStartNewSession} size="lg" variant="secondary">
            Start new session
          </Button>
        </div>
      </div>
    </div>
  );
}
