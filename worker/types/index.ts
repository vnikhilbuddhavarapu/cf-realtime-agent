import type { InterviewAgent } from "../agents/InterviewAgent";

export interface Env {
  AI: Ai;
  VECTORIZE: Vectorize;
  INTERVIEW_AGENT: DurableObjectNamespace<InterviewAgent>;
  SESSION_MANAGER: DurableObjectNamespace;
  ACCOUNT_ID: string;
  API_TOKEN: string;
  REALTIME_APP_ID: string;
  REALTIME_PRESET_ID: string;
  REALTIME_PRESET_NAME: string;
  DEEPGRAM_API_KEY: string;
  ELEVENLABS_API_KEY: string;
}

// === SCENARIO & PERSONA TYPES (matching frontend) ===
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
export type VoiceId = "voice_sarah" | "voice_michael";

export interface ScenarioConfig {
  id: ScenarioId;
  name: string;
  description: string;
  difficulty: Difficulty;
  duration: number;
  focusAreas: string[];
}

export interface PersonaConfig {
  interviewerName: string;
  interviewerTitle: string;
  companyName: string;
  candidateName: string;
  demeanor: Demeanor;
  probingLevel: ProbingLevel;
  feedbackStyle: FeedbackStyle;
  voiceId: VoiceId;
}

// === SESSION & ROLEPLAY DATA ===
export interface SessionData {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
  roleplays: RoleplayData[];
}

export interface RoleplayData {
  roleplayId: string;
  sessionId: string;
  scenario: ScenarioConfig;
  persona: PersonaConfig;
  jobDescription?: string;
  resume?: string;
  meetingId?: string;
  status: "created" | "active" | "ended";
  createdAt: number;
  endedAt?: number;
}

export interface CreateSessionResponse {
  sessionId: string;
  expiresAt: number;
}

export interface CreateRoleplayRequest {
  sessionId: string;
  scenario: ScenarioConfig;
  persona: PersonaConfig;
}

export interface CreateRoleplayResponse {
  roleplayId: string;
  sessionId: string;
  scenario: ScenarioConfig;
  persona: PersonaConfig;
}

export interface StartMeetingResponse {
  meetingId: string;
  authToken: string;
  joinUrl: string;
  roleplayId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
