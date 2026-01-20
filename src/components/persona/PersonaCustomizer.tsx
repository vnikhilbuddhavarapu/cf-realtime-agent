import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  ChevronLeft,
  Cpu,
  MessageSquareText,
  Phone,
  SlidersHorizontal,
  Target,
  Theater,
  Trophy,
  User,
} from "lucide-react";
import type {
  PersonaConfig,
  ScenarioConfig,
  ScenarioPreset,
  Difficulty,
  Demeanor,
  ProbingLevel,
  FeedbackStyle,
  VoiceId,
} from '../../lib/types';
import { FOCUS_AREA_OPTIONS, VOICE_OPTIONS } from '../../lib/scenarios';
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardTitle } from "../ui/Card";
import { cn } from "../../lib/cn";

interface PersonaCustomizerProps {
  scenarioPreset: ScenarioPreset;
  onContinue: (scenario: ScenarioConfig, persona: PersonaConfig) => void;
  onBack: () => void;
}

const difficulties: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Easy', description: 'Gentle questions, supportive feedback' },
  { value: 'medium', label: 'Medium', description: 'Standard difficulty, balanced approach' },
  { value: 'hard', label: 'Hard', description: 'Challenging questions, detailed follow-ups' },
];

const demeanors: { value: Demeanor; label: string; description: string }[] = [
  { value: 'warm', label: 'Warm', description: 'Friendly and encouraging' },
  { value: 'professional', label: 'Professional', description: 'Formal and structured' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'formal', label: 'Formal', description: 'Business-like and reserved' },
  { value: 'challenging', label: 'Challenging', description: 'Direct and probing' },
];

const probingLevels: { value: ProbingLevel; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Accepts answers, minimal follow-up' },
  { value: 'moderate', label: 'Moderate', description: '1-2 follow-ups for clarity' },
  { value: 'deep', label: 'Deep', description: 'Digs into details, asks "why"' },
];

const feedbackStyles: { value: FeedbackStyle; label: string; description: string }[] = [
  { value: 'encouraging', label: 'Encouraging', description: 'Positive reinforcement' },
  { value: 'neutral', label: 'Neutral', description: 'No emotional feedback' },
  { value: 'direct', label: 'Direct', description: 'Straightforward critique' },
];

const durations = [15, 30, 45, 60];

export function PersonaCustomizer({ scenarioPreset, onContinue, onBack }: PersonaCustomizerProps) {
  const getScenarioIcon = (scenarioId: ScenarioPreset["id"]) => {
    switch (scenarioId) {
      case "phone_screen":
        return Phone;
      case "behavioral":
        return Target;
      case "technical":
        return Cpu;
      case "hiring_manager":
        return Briefcase;
      case "final_round":
        return Trophy;
      default:
        return Target;
    }
  };

  const ScenarioIcon = getScenarioIcon(scenarioPreset.id);

  // Scenario settings (from preset, customizable)
  const [difficulty, setDifficulty] = useState<Difficulty>(scenarioPreset.defaultDifficulty);
  const [duration, setDuration] = useState(scenarioPreset.defaultDuration);
  const [focusAreas, setFocusAreas] = useState<string[]>(scenarioPreset.defaultFocusAreas);

  // Persona settings (from preset, customizable)
  const [interviewerName, setInterviewerName] = useState(scenarioPreset.defaultPersona.interviewerName);
  const [interviewerTitle, setInterviewerTitle] = useState(scenarioPreset.defaultPersona.interviewerTitle);
  const [companyName, setCompanyName] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [demeanor, setDemeanor] = useState<Demeanor>(scenarioPreset.defaultPersona.demeanor);
  const [probingLevel, setProbingLevel] = useState<ProbingLevel>(scenarioPreset.defaultPersona.probingLevel);
  const [feedbackStyle, setFeedbackStyle] = useState<FeedbackStyle>(scenarioPreset.defaultPersona.feedbackStyle);
  const [voiceId, setVoiceId] = useState<VoiceId>(scenarioPreset.defaultPersona.voiceId);

  const toggleFocusArea = (areaId: string) => {
    setFocusAreas(prev =>
      prev.includes(areaId)
        ? prev.filter(a => a !== areaId)
        : [...prev, areaId]
    );
  };

  const handleContinue = () => {
    const scenario: ScenarioConfig = {
      id: scenarioPreset.id,
      name: scenarioPreset.name,
      description: scenarioPreset.description,
      difficulty,
      duration,
      focusAreas,
    };

    const persona: PersonaConfig = {
      interviewerName,
      interviewerTitle,
      companyName: companyName || 'the company',
      candidateName: candidateName || 'Candidate',
      demeanor,
      probingLevel,
      feedbackStyle,
      voiceId,
    };

    onContinue(scenario, persona);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-50">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <img src="/icon.png" className="w-7 h-7 rounded-xl bg-black" />
            <span className="text-xl font-semibold tracking-tight">InterviewAI</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Badge>
              <ScenarioIcon className="h-3.5 w-3.5" />
              {scenarioPreset.name}
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
            Customize your interview
          </h1>
          <p className="text-zinc-400">Tailor the experience to match your preparation goals</p>
        </div>

        <div className="space-y-6">
          {/* Your Info */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between gap-6">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-300" />
                    Your information
                  </CardTitle>
                  <CardDescription>Set names used in the simulation.</CardDescription>
                </div>
              </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Your Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Target Company</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Google, Stripe, Cloudflare"
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Interviewer Identity */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between gap-6 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Theater className="h-4 w-4 text-zinc-300" />
                    Interviewer identity
                  </CardTitle>
                  <CardDescription>Customize who you’re talking to.</CardDescription>
                </div>
              </div>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Interviewer Name</label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Interviewer Title</label>
                <input
                  type="text"
                  value={interviewerTitle}
                  onChange={(e) => setInterviewerTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:border-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>
            {/* Voice Selection */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Voice</label>
              <div className="grid grid-cols-2 gap-3">
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setVoiceId(voice.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-colors",
                      voiceId === voice.id
                        ? "border-zinc-200 bg-zinc-50/5"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs text-zinc-400">{voice.description}</div>
                  </button>
                ))}
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Interview Style */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between gap-6 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4 text-zinc-300" />
                    Interview style
                  </CardTitle>
                  <CardDescription>How the interviewer behaves.</CardDescription>
                </div>
              </div>
            
            {/* Demeanor */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-2">Demeanor</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {demeanors.map((dem) => (
                  <button
                    key={dem.value}
                    onClick={() => setDemeanor(dem.value)}
                    className={cn(
                      "p-3 rounded-xl border transition-colors",
                      demeanor === dem.value
                        ? "border-zinc-200 bg-zinc-50/5"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    <div className="font-medium text-sm">{dem.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Probing Level */}
            <div className="mb-4">
              <label className="block text-sm text-zinc-400 mb-2">Follow-up Intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {probingLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setProbingLevel(level.value)}
                    className={cn(
                      "p-3 rounded-xl border transition-colors",
                      probingLevel === level.value
                        ? "border-zinc-200 bg-zinc-50/5"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className="text-xs text-zinc-400">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Style */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Feedback Style</label>
              <div className="grid grid-cols-3 gap-2">
                {feedbackStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setFeedbackStyle(style.value)}
                    className={cn(
                      "p-3 rounded-xl border transition-colors",
                      feedbackStyle === style.value
                        ? "border-zinc-200 bg-zinc-50/5"
                        : "border-zinc-800 hover:border-zinc-700",
                    )}
                  >
                    <div className="font-medium text-sm">{style.label}</div>
                    <div className="text-xs text-zinc-400">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Difficulty & Duration */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between gap-6 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-zinc-300" />
                    Difficulty & Duration
                  </CardTitle>
                  <CardDescription>Choose how hard and how long.</CardDescription>
                </div>
              </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setDifficulty(diff.value)}
                      className={cn(
                        "p-3 rounded-xl border transition-colors",
                        difficulty === diff.value
                          ? "border-zinc-200 bg-zinc-50/5"
                          : "border-zinc-800 hover:border-zinc-700",
                      )}
                    >
                      <div className="font-medium text-sm">{diff.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {durations.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setDuration(dur)}
                      className={cn(
                        "p-3 rounded-xl border transition-colors",
                        duration === dur
                          ? "border-zinc-200 bg-zinc-50/5"
                          : "border-zinc-800 hover:border-zinc-700",
                      )}
                    >
                      <div className="font-bold">{dur}</div>
                      <div className="text-xs text-zinc-400">min</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </CardContent>
          </Card>

          {/* Focus Areas */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between gap-6 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-zinc-300" />
                    Focus areas
                  </CardTitle>
                  <CardDescription>Select what you want to emphasize.</CardDescription>
                </div>
              </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FOCUS_AREA_OPTIONS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => toggleFocusArea(area.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-colors text-sm",
                    focusAreas.includes(area.id)
                      ? "border-zinc-200 bg-zinc-50/5"
                      : "border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  {area.label}
                </button>
              ))}
            </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-zinc-500">
              You can add your resume and job description on the next screen
            </p>
            <Button onClick={handleContinue} size="lg">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
