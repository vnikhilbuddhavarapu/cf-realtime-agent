// API client for backend communication

import type { ScenarioConfig, PersonaConfig } from "./types";

const API_BASE = "";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SessionData {
  sessionId: string;
  expiresAt: number;
}

interface RoleplayData {
  roleplayId: string;
  sessionId: string;
  scenario: ScenarioConfig;
  persona: PersonaConfig;
}

interface MeetingData {
  meetingId: string;
  authToken: string;
  joinUrl: string;
  roleplayId: string;
}

interface MeetingReadyData {
  ready: boolean;
  initInProgress: boolean;
  hasPipeline: boolean;
  meetingJoined: boolean;
}

export async function createSession(): Promise<ApiResponse<SessionData>> {
  const response = await fetch(`${API_BASE}/api/session`, {
    method: "POST",
  });
  if (!response.ok) throw new Error("Failed to create session");
  return response.json();
}

export async function getMeetingReady(
  meetingId: string,
): Promise<ApiResponse<MeetingReadyData>> {
  const response = await fetch(
    `${API_BASE}/api/meeting/ready?meetingId=${encodeURIComponent(meetingId)}`,
  );
  if (!response.ok) throw new Error("Failed to get meeting readiness");
  return response.json();
}

export async function createRoleplay(
  sessionId: string,
  scenario: ScenarioConfig,
  persona: PersonaConfig,
): Promise<ApiResponse<RoleplayData>> {
  const response = await fetch(`${API_BASE}/api/roleplay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, scenario, persona }),
  });
  if (!response.ok) throw new Error("Failed to create roleplay");
  return response.json();
}

export async function startMeeting(
  roleplayId: string,
): Promise<ApiResponse<MeetingData>> {
  const response = await fetch(`${API_BASE}/api/meeting/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleplayId }),
  });
  if (!response.ok) throw new Error("Failed to start meeting");
  return response.json();
}

export async function endMeeting(roleplayId: string) {
  const response = await fetch(`${API_BASE}/api/meeting/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleplayId }),
  });
  if (!response.ok) throw new Error("Failed to end meeting");
  return response.json();
}

export async function generateReport(
  roleplayId: string,
): Promise<ApiResponse<import("./types").InterviewReport>> {
  const response = await fetch(`${API_BASE}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleplayId }),
  });
  if (!response.ok) throw new Error("Failed to generate report");
  return response.json();
}
