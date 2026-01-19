// Scenario presets with default persona configurations

import type { ScenarioPreset, ScenarioId } from "./types";

export const SCENARIO_PRESETS: Record<ScenarioId, ScenarioPreset> = {
  phone_screen: {
    id: "phone_screen",
    name: "Phone Screen",
    description:
      "Initial recruiter conversation to assess basic fit and interest",
    icon: "📞",
    color: "from-[#10B981] to-[#059669]",
    defaultDifficulty: "easy",
    defaultDuration: 15,
    defaultFocusAreas: ["communication", "motivation", "culture_fit"],
    defaultPersona: {
      interviewerName: "Sarah",
      interviewerTitle: "Senior Recruiter",
      demeanor: "warm",
      probingLevel: "light",
      feedbackStyle: "encouraging",
      voiceId: "voice_sarah",
    },
  },

  behavioral: {
    id: "behavioral",
    name: "Behavioral Interview",
    description: "Deep dive into past experiences using the STAR method",
    icon: "🎯",
    color: "from-[#3B82F6] to-[#2563EB]",
    defaultDifficulty: "medium",
    defaultDuration: 30,
    defaultFocusAreas: ["past_experiences", "problem_solving", "teamwork"],
    defaultPersona: {
      interviewerName: "Michael",
      interviewerTitle: "Hiring Manager",
      demeanor: "professional",
      probingLevel: "deep",
      feedbackStyle: "neutral",
      voiceId: "voice_michael",
    },
  },

  technical: {
    id: "technical",
    name: "Technical Interview",
    description: "System design, architecture, and technical problem solving",
    icon: "💻",
    color: "from-[#8B5CF6] to-[#7C3AED]",
    defaultDifficulty: "medium",
    defaultDuration: 45,
    defaultFocusAreas: ["technical_depth", "system_design", "problem_solving"],
    defaultPersona: {
      interviewerName: "Alex",
      interviewerTitle: "Staff Engineer",
      demeanor: "casual",
      probingLevel: "deep",
      feedbackStyle: "direct",
      voiceId: "voice_michael",
    },
  },

  hiring_manager: {
    id: "hiring_manager",
    name: "Hiring Manager Round",
    description: "Team fit, career goals, and leadership assessment",
    icon: "👔",
    color: "from-[#F59E0B] to-[#D97706]",
    defaultDifficulty: "medium",
    defaultDuration: 30,
    defaultFocusAreas: ["leadership", "career_goals", "team_fit"],
    defaultPersona: {
      interviewerName: "Jennifer",
      interviewerTitle: "Engineering Manager",
      demeanor: "professional",
      probingLevel: "moderate",
      feedbackStyle: "neutral",
      voiceId: "voice_sarah",
    },
  },

  final_round: {
    id: "final_round",
    name: "Final Round",
    description:
      "Executive-level discussion on strategic thinking and culture alignment",
    icon: "🏆",
    color: "from-[#EC4899] to-[#DB2777]",
    defaultDifficulty: "hard",
    defaultDuration: 30,
    defaultFocusAreas: [
      "strategic_thinking",
      "culture_fit",
      "vision_alignment",
    ],
    defaultPersona: {
      interviewerName: "David",
      interviewerTitle: "VP of Engineering",
      demeanor: "formal",
      probingLevel: "moderate",
      feedbackStyle: "neutral",
      voiceId: "voice_michael",
    },
  },
};

// Focus area options for customization
export const FOCUS_AREA_OPTIONS = [
  { id: "communication", label: "Communication Skills" },
  { id: "technical_depth", label: "Technical Depth" },
  { id: "problem_solving", label: "Problem Solving" },
  { id: "system_design", label: "System Design" },
  { id: "leadership", label: "Leadership" },
  { id: "teamwork", label: "Teamwork" },
  { id: "past_experiences", label: "Past Experiences" },
  { id: "motivation", label: "Motivation & Interest" },
  { id: "culture_fit", label: "Culture Fit" },
  { id: "career_goals", label: "Career Goals" },
  { id: "strategic_thinking", label: "Strategic Thinking" },
  { id: "conflict_resolution", label: "Conflict Resolution" },
];

// Voice options
export const VOICE_OPTIONS = [
  {
    id: "voice_sarah" as const,
    name: "Sarah",
    description: "Warm, conversational female voice",
  },
  {
    id: "voice_michael" as const,
    name: "Michael",
    description: "Professional, clear male voice",
  },
];

// Helper to get scenario list for UI
export const getScenarioList = (): ScenarioPreset[] => {
  return Object.values(SCENARIO_PRESETS);
};

// Helper to get a scenario by ID
export const getScenarioById = (id: ScenarioId): ScenarioPreset => {
  return SCENARIO_PRESETS[id];
};
