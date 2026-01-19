export interface SessionRow {
  session_id: string;
  created_at: number;
  expires_at: number;
}

export interface RoleplayRow {
  roleplay_id: string;
  session_id: string;
  scenario: string;
  persona: string;
  job_description: string | null;
  resume: string | null;
  meeting_id: string | null;
  status: string;
  created_at: number;
  ended_at: number | null;
}

export interface RequestBody {
  [key: string]: unknown;
}
