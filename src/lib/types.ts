// Shared types for the application

// === SCENARIO TYPES ===
export type ScenarioId =
  | "phone_screen"
  | "behavioral"
  | "technical"
  | "hiring_manager"
  | "final_round";

export type Difficulty = "easy" | "medium" | "hard";

export type Demeanor =
  | "warm"
  | "professional"
  | "formal"
  | "casual"
  | "challenging";

export type ProbingLevel = "light" | "moderate" | "deep";

export type FeedbackStyle = "encouraging" | "neutral" | "direct";

export type VoiceId = "voice_sarah" | "voice_michael"; // ElevenLabs voice IDs

// === PERSONA CONFIG ===
export interface PersonaConfig {
  // Interviewer Identity
  interviewerName: string;
  interviewerTitle: string;
  companyName: string;

  // Candidate Identity
  candidateName: string;

  // Behavior Settings
  demeanor: Demeanor;
  probingLevel: ProbingLevel;
  feedbackStyle: FeedbackStyle;

  // Voice
  voiceId: VoiceId;
}

// === SCENARIO CONFIG ===
export interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  description: string;
  difficulty: Difficulty;
  duration: number; // minutes
  focusAreas: string[];
}

// === SCENARIO PRESET (includes default persona) ===
export interface ScenarioPreset {
  id: ScenarioId;
  name: string;
  description: string;
  icon: string; // emoji or icon name
  color: string; // tailwind gradient
  defaultDifficulty: Difficulty;
  defaultDuration: number;
  defaultFocusAreas: string[];
  defaultPersona: Omit<PersonaConfig, "candidateName" | "companyName">;
}

// === FULL INTERVIEW CONFIG (what we send to backend) ===
export interface InterviewConfig {
  scenario: ScenarioConfig;
  persona: PersonaConfig;
}

// === SESSION STATE ===
export interface SessionState {
  sessionId: string | null;
  roleplayId: string | null;
  scenario: ScenarioConfig | null;
  persona: PersonaConfig | null;
  meetingId: string | null;
  authToken: string | null;
}

// === LEGACY COMPATIBILITY (remove after migration) ===
export type InterviewScenario = ScenarioId;

// === INSIGHTS TYPES ===
export type InsightType =
  | "framework"
  | "resume_highlight"
  | "question_guidance"
  | "recovery"
  | "positive";

export type InsightPriority = "high" | "medium" | "low";

export type QuestionType =
  | "behavioral"
  | "technical"
  | "situational"
  | "competency"
  | "motivation"
  | "unknown";

export interface STARProgress {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
}

export interface Insight {
  id: string;
  roleplayId: string;
  timestamp: number;
  type: InsightType;
  priority: InsightPriority;
  message: string;
  context?: {
    questionType?: QuestionType;
    frameworkProgress?: STARProgress;
    resumeReference?: string;
    interviewerQuestion?: string;
    userResponse?: string;
  };
  shown: boolean;
}

export interface TranscriptEntry {
  id: string;
  roleplayId: string;
  timestamp: number;
  speaker: "interviewer" | "user";
  speakerName: string;
  text: string;
  isPartial: boolean;
}

// WebSocket message types for insights
export type InsightsWSMessage =
  | { type: "insight"; data: Insight }
  | { type: "transcript"; data: TranscriptEntry }
  | { type: "star_progress"; data: STARProgress }
  | { type: "question_type"; data: QuestionType }
  | { type: "connected"; roleplayId: string }
  | { type: "error"; message: string };
