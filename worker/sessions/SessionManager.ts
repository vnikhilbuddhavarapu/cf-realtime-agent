import type {
  SessionData,
  RoleplayData,
  ScenarioConfig,
  PersonaConfig,
} from "../types";
import type { SessionRow, RoleplayRow } from "../types/sql";
import { Logger } from "../utils/logger";

// Helper to safely parse JSON or return null
function parseJsonOrNull<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export class SessionManager {
  private logger: Logger;
  private sql: SqlStorage;

  constructor(ctx: DurableObjectState) {
    this.logger = new Logger("SessionManager");
    this.sql = ctx.storage.sql;
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.sql.exec(`
			CREATE TABLE IF NOT EXISTS sessions (
				session_id TEXT PRIMARY KEY,
				created_at INTEGER NOT NULL,
				expires_at INTEGER NOT NULL
			)
		`);

    this.sql.exec(`
			CREATE TABLE IF NOT EXISTS roleplays (
				roleplay_id TEXT PRIMARY KEY,
				session_id TEXT NOT NULL,
				scenario TEXT NOT NULL,
				persona TEXT NOT NULL,
				job_description TEXT,
				resume TEXT,
				meeting_id TEXT,
				status TEXT NOT NULL,
				created_at INTEGER NOT NULL,
				ended_at INTEGER,
				FOREIGN KEY (session_id) REFERENCES sessions(session_id)
			)
		`);

    this.logger.info("Database initialized");
  }

  async createSession(): Promise<SessionData> {
    const sessionId = crypto.randomUUID();
    const createdAt = Date.now();
    const expiresAt = createdAt + 24 * 60 * 60 * 1000; // 24 hours

    this.sql.exec(
      `INSERT INTO sessions (session_id, created_at, expires_at) VALUES (?, ?, ?)`,
      sessionId,
      createdAt,
      expiresAt,
    );

    this.logger.info("Session created", { sessionId, expiresAt });

    return {
      sessionId,
      createdAt,
      expiresAt,
      roleplays: [],
    };
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const session = this.sql
      .exec(`SELECT * FROM sessions WHERE session_id = ?`, sessionId)
      .toArray()[0] as unknown as SessionRow | undefined;

    if (!session) {
      this.logger.warn("Session not found", { sessionId });
      return null;
    }

    const now = Date.now();
    if (session.expires_at < now) {
      this.logger.warn("Session expired", { sessionId });
      return null;
    }

    const roleplays = this.sql
      .exec(`SELECT * FROM roleplays WHERE session_id = ?`, sessionId)
      .toArray() as unknown as RoleplayRow[];

    return {
      sessionId: session.session_id,
      createdAt: session.created_at,
      expiresAt: session.expires_at,
      roleplays: roleplays.map((r) => ({
        roleplayId: r.roleplay_id,
        sessionId: r.session_id,
        scenario: parseJsonOrNull<ScenarioConfig>(r.scenario)!,
        persona: parseJsonOrNull<PersonaConfig>(r.persona)!,
        jobDescription: r.job_description ?? undefined,
        resume: r.resume ?? undefined,
        meetingId: r.meeting_id ?? undefined,
        status: r.status as "created" | "active" | "ended",
        createdAt: r.created_at,
        endedAt: r.ended_at ?? undefined,
      })),
    };
  }

  async createRoleplay(
    sessionId: string,
    scenario: ScenarioConfig,
    persona: PersonaConfig,
    jobDescription?: string,
    resume?: string,
  ): Promise<RoleplayData> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error("Session not found or expired");
    }

    const roleplayId = crypto.randomUUID();
    const createdAt = Date.now();

    // Store scenario and persona as JSON strings in the database
    const scenarioJson = JSON.stringify(scenario);
    const personaJson = JSON.stringify(persona);

    this.sql.exec(
      `INSERT INTO roleplays (
				roleplay_id, session_id, scenario, persona, 
				job_description, resume, status, created_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      roleplayId,
      sessionId,
      scenarioJson,
      personaJson,
      jobDescription || null,
      resume || null,
      "created",
      createdAt,
    );

    this.logger.info("Roleplay created", {
      roleplayId,
      sessionId,
      scenarioId: scenario.id,
      interviewerName: persona.interviewerName,
    });

    return {
      roleplayId,
      sessionId,
      scenario,
      persona,
      jobDescription,
      resume,
      status: "created",
      createdAt,
    };
  }

  async getRoleplay(roleplayId: string): Promise<RoleplayData | null> {
    const roleplay = this.sql
      .exec(`SELECT * FROM roleplays WHERE roleplay_id = ?`, roleplayId)
      .toArray()[0] as unknown as RoleplayRow | undefined;

    if (!roleplay) {
      this.logger.warn("Roleplay not found", { roleplayId });
      return null;
    }

    return {
      roleplayId: roleplay.roleplay_id,
      sessionId: roleplay.session_id,
      scenario: parseJsonOrNull<ScenarioConfig>(roleplay.scenario)!,
      persona: parseJsonOrNull<PersonaConfig>(roleplay.persona)!,
      jobDescription: roleplay.job_description ?? undefined,
      resume: roleplay.resume ?? undefined,
      meetingId: roleplay.meeting_id ?? undefined,
      status: roleplay.status as "created" | "active" | "ended",
      createdAt: roleplay.created_at,
      endedAt: roleplay.ended_at ?? undefined,
    };
  }

  async updateRoleplayStatus(
    roleplayId: string,
    status: "created" | "active" | "ended",
    meetingId?: string,
  ): Promise<void> {
    const updates: string[] = ["status = ?"];
    const params: (string | number)[] = [status];

    if (meetingId) {
      updates.push("meeting_id = ?");
      params.push(meetingId);
    }

    if (status === "ended") {
      updates.push("ended_at = ?");
      params.push(Date.now());
    }

    params.push(roleplayId);

    this.sql.exec(
      `UPDATE roleplays SET ${updates.join(", ")} WHERE roleplay_id = ?`,
      ...params,
    );

    this.logger.info("Roleplay status updated", {
      roleplayId,
      status,
      meetingId,
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/session" && request.method === "POST") {
        const session = await this.createSession();
        return Response.json({ success: true, data: session });
      }

      if (path === "/session" && request.method === "GET") {
        const sessionId = url.searchParams.get("sessionId");
        if (!sessionId) {
          return Response.json(
            { success: false, error: "Missing sessionId" },
            { status: 400 },
          );
        }
        const session = await this.getSession(sessionId);
        if (!session) {
          return Response.json(
            { success: false, error: "Session not found" },
            { status: 404 },
          );
        }
        return Response.json({ success: true, data: session });
      }

      if (path === "/roleplay" && request.method === "POST") {
        const body = (await request.json()) as {
          sessionId: string;
          scenario: ScenarioConfig;
          persona: PersonaConfig;
          jobDescription?: string;
          resume?: string;
        };
        const roleplay = await this.createRoleplay(
          body.sessionId,
          body.scenario,
          body.persona,
          body.jobDescription,
          body.resume,
        );
        return Response.json({ success: true, data: roleplay });
      }

      if (path === "/roleplay/update" && request.method === "POST") {
        const body = (await request.json()) as {
          roleplayId: string;
          status: "created" | "active" | "ended";
          meetingId?: string;
        };
        await this.updateRoleplayStatus(
          body.roleplayId,
          body.status,
          body.meetingId,
        );
        return Response.json({ success: true });
      }

      if (path === "/roleplay" && request.method === "GET") {
        const roleplayId = url.searchParams.get("roleplayId");
        if (!roleplayId) {
          return Response.json(
            { success: false, error: "Missing roleplayId" },
            { status: 400 },
          );
        }
        const roleplay = await this.getRoleplay(roleplayId);
        if (!roleplay) {
          return Response.json(
            { success: false, error: "Roleplay not found" },
            { status: 404 },
          );
        }
        return Response.json({ success: true, data: roleplay });
      }

      return Response.json(
        { success: false, error: "Not found" },
        { status: 404 },
      );
    } catch (error) {
      this.logger.error("Request failed", error);
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  }
}
