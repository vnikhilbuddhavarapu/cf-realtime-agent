import { useState } from 'react';
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
    <div className="min-h-screen bg-linear-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#2A2A2A] text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#0F0F0F]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#F5F5F5] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-linear-to-br from-[#3B82F6] to-[#2563EB] rounded-lg" />
            <span className="text-xl font-bold">InterviewAI</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full text-sm mb-4">
            <span>{scenarioPreset.icon}</span>
            <span>{scenarioPreset.name}</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Customize Your Interview</h1>
          <p className="text-[#9CA3AF]">
            Tailor the experience to match your preparation goals
          </p>
        </div>

        <div className="space-y-6">
          {/* Your Info */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>👤</span> Your Information
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Your Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg focus:border-[#3B82F6] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Target Company</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., Google, Stripe, Cloudflare"
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg focus:border-[#3B82F6] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Interviewer Identity */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>🎭</span> Interviewer Identity
            </h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Interviewer Name</label>
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg focus:border-[#3B82F6] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Interviewer Title</label>
                <input
                  type="text"
                  value={interviewerTitle}
                  onChange={(e) => setInterviewerTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-lg focus:border-[#3B82F6] focus:outline-none transition-colors"
                />
              </div>
            </div>
            {/* Voice Selection */}
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-2">Voice</label>
              <div className="grid grid-cols-2 gap-3">
                {VOICE_OPTIONS.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setVoiceId(voice.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      voiceId === voice.id
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                    }`}
                  >
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs text-[#9CA3AF]">{voice.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interview Style */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>💬</span> Interview Style
            </h3>
            
            {/* Demeanor */}
            <div className="mb-4">
              <label className="block text-sm text-[#9CA3AF] mb-2">Demeanor</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {demeanors.map((dem) => (
                  <button
                    key={dem.value}
                    onClick={() => setDemeanor(dem.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      demeanor === dem.value
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{dem.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Probing Level */}
            <div className="mb-4">
              <label className="block text-sm text-[#9CA3AF] mb-2">Follow-up Intensity</label>
              <div className="grid grid-cols-3 gap-2">
                {probingLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setProbingLevel(level.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      probingLevel === level.value
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className="text-xs text-[#9CA3AF]">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Style */}
            <div>
              <label className="block text-sm text-[#9CA3AF] mb-2">Feedback Style</label>
              <div className="grid grid-cols-3 gap-2">
                {feedbackStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setFeedbackStyle(style.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      feedbackStyle === style.value
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{style.label}</div>
                    <div className="text-xs text-[#9CA3AF]">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Difficulty & Duration */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>⚙️</span> Difficulty & Duration
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {difficulties.map((diff) => (
                    <button
                      key={diff.value}
                      onClick={() => setDifficulty(diff.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        difficulty === diff.value
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{diff.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {durations.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setDuration(dur)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        duration === dur
                          ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                          : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                      }`}
                    >
                      <div className="font-bold">{dur}</div>
                      <div className="text-xs text-[#9CA3AF]">min</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Focus Areas */}
          <div className="bg-[#1a1a1a] border border-[#2A2A2A] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <span>🎯</span> Focus Areas
            </h3>
            <p className="text-sm text-[#9CA3AF] mb-4">Select areas you want to emphasize</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FOCUS_AREA_OPTIONS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => toggleFocusArea(area.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-sm ${
                    focusAreas.includes(area.id)
                      ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                      : 'border-[#2A2A2A] hover:border-[#3B82F6]/50'
                  }`}
                >
                  {area.label}
                </button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-between items-center pt-4">
            <p className="text-sm text-[#6B7280]">
              You can add your resume and job description on the next screen
            </p>
            <button
              onClick={handleContinue}
              className="px-8 py-4 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg text-lg font-semibold transition-all hover:scale-105 shadow-lg shadow-[#3B82F6]/20"
            >
              Continue →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
