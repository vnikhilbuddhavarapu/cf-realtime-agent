import type {
  Env,
  ApiResponse,
  SessionData,
  RoleplayData,
  StartMeetingResponse,
  ScenarioConfig,
  PersonaConfig,
  InterviewReport,
} from "../types";
import { Logger } from "../utils/logger";
import { jsonResponse, errorResponse } from "../utils/response";
import { createRealtimeKitMeeting } from "../utils/realtimekit";

const logger = new Logger("APIRoutes");
const SESSION_MANAGER_ID = "global-session-manager";

export async function handleCreateSession(env: Env): Promise<Response> {
  try {
    const id = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const stub = env.SESSION_MANAGER.get(id);

    const response = await stub.fetch("http://internal/session", {
      method: "POST",
    });

    const result = (await response.json()) as ApiResponse<SessionData>;
    logger.info("Session created", { sessionId: result.data?.sessionId });
    return jsonResponse(result.data);
  } catch (error) {
    logger.error("Failed to create session", error);
    return errorResponse("Failed to create session", 500);
  }
}

export async function handleGetSession(
  env: Env,
  sessionId: string,
): Promise<Response> {
  try {
    const id = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const stub = env.SESSION_MANAGER.get(id);

    const response = await stub.fetch(
      `http://internal/session?sessionId=${sessionId}`,
    );
    const result = (await response.json()) as ApiResponse<SessionData>;

    if (!result.success) {
      return errorResponse(result.error || "Session not found", 404);
    }

    return jsonResponse(result.data);
  } catch (error) {
    logger.error("Failed to get session", error);
    return errorResponse("Failed to get session", 500);
  }
}

export async function handleCreateRoleplay(
  env: Env,
  sessionId: string,
  body: {
    scenario: ScenarioConfig;
    persona: PersonaConfig;
    jobDescription?: string;
    resume?: string;
  },
): Promise<Response> {
  try {
    const sessionMgrId = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const stub = env.SESSION_MANAGER.get(sessionMgrId);

    const response = await stub.fetch("http://internal/roleplay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...body }),
    });

    const result = (await response.json()) as ApiResponse<RoleplayData>;

    if (!result.success || !result.data) {
      return errorResponse(result.error || "Failed to create roleplay", 400);
    }

    logger.info("Roleplay created", {
      sessionId,
      roleplayId: result.data.roleplayId,
    });
    return jsonResponse(result.data);
  } catch (error) {
    logger.error("Failed to create roleplay", error);
    return errorResponse("Failed to create roleplay", 500);
  }
}

export async function handleStartMeeting(
  env: Env,
  roleplayId: string,
  request: Request,
): Promise<Response> {
  try {
    const sessionManagerId = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const stub = env.SESSION_MANAGER.get(sessionManagerId);

    const roleplayResponse = await stub.fetch(
      `http://internal/roleplay?roleplayId=${roleplayId}`,
    );
    const roleplayResult =
      (await roleplayResponse.json()) as ApiResponse<RoleplayData>;

    if (!roleplayResult.success || !roleplayResult.data) {
      return errorResponse("Roleplay not found", 404);
    }

    const roleplay = roleplayResult.data;
    if (!roleplay) {
      return errorResponse("Roleplay data not found", 404);
    }

    // Create a real RealtimeKit meeting using Cloudflare Calls API
    const meetingTitle = `${roleplay.scenario.name} - ${roleplay.persona.candidateName}`;
    const { meetingId, authToken } = await createRealtimeKitMeeting(
      env.ACCOUNT_ID,
      env.REALTIME_APP_ID,
      env.API_TOKEN,
      meetingTitle,
      env.REALTIME_PRESET_ID,
      env.REALTIME_PRESET_NAME,
    );

    // Use the request's host (hostname only, no protocol) per npm docs
    const url = new URL(request.url);
    const workerHost = url.host; // Just hostname, no https://

    logger.info("Calling agent init with params", {
      roleplayId,
      meetingId,
      workerHost,
      accountId: env.ACCOUNT_ID,
      scenario: roleplay.scenario,
      persona: roleplay.persona,
    });

    // Get session manager and update roleplay status
    const sessionMgrId = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const sessionManagerStub = env.SESSION_MANAGER.get(sessionMgrId);

    // Update roleplay to active status with meetingId
    await sessionManagerStub.fetch("http://internal/roleplay/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleplayId,
        status: "active",
        meetingId,
      }),
    });

    // Get agent stub and call init() directly via RPC
    const agentId = env.INTERVIEW_AGENT.idFromName(meetingId);
    const agentStub = env.INTERVIEW_AGENT.get(agentId);

    try {
      await agentStub.init(
        meetingId, // agentId
        meetingId,
        authToken,
        workerHost, // Hostname only, no https://
        env.ACCOUNT_ID,
        env.API_TOKEN,
        roleplay.scenario,
        roleplay.persona,
        roleplayId, // Pass roleplayId for RAG context
      );
    } catch (error) {
      logger.error("Agent init failed", error);
      return errorResponse(
        `Agent initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        500,
      );
    }

    logger.info("Meeting started", { roleplayId, meetingId });

    // Create a separate participant token for the human user to join
    logger.info("Creating human participant token");
    const humanParticipantUrl = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/realtime/kit/${env.REALTIME_APP_ID}/meetings/${meetingId}/participants`;

    const humanParticipantResponse = await fetch(humanParticipantUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.API_TOKEN}`,
      },
      body: JSON.stringify({
        name: "Interview Candidate",
        presetName: env.REALTIME_PRESET_NAME,
        customParticipantId: `human-${meetingId}`,
      }),
    });

    const humanParticipantData = (await humanParticipantResponse.json()) as {
      success: boolean;
      data?: { token: string; id: string };
      errors?: Array<{ message: string }>;
    };

    if (!humanParticipantData.success || !humanParticipantData.data) {
      const errorMsg =
        humanParticipantData.errors?.[0]?.message ||
        "Failed to create human participant";
      logger.error("Failed to create human participant", new Error(errorMsg), {
        fullResponse: humanParticipantData,
        status: humanParticipantResponse.status,
      });
      throw new Error(`Failed to create human participant: ${errorMsg}`);
    }

    const humanAuthToken = humanParticipantData.data.token;
    logger.info("Human participant created", {
      participantId: humanParticipantData.data.id,
    });

    return jsonResponse<StartMeetingResponse>({
      meetingId,
      authToken: humanAuthToken, // Return human token, not agent token
      joinUrl: `https://demo.realtime.cloudflare.com/v2/meeting?id=${meetingId}&authToken=${humanAuthToken}`,
      roleplayId, // Include roleplayId for cleanup
    });
  } catch (error) {
    logger.error("Failed to start meeting", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to start meeting",
      500,
    );
  }
}

export async function handleEndMeeting(
  env: Env,
  roleplayId: string,
): Promise<Response> {
  const logger = new Logger("APIRoutes");

  try {
    // First get the roleplay data to find the meetingId
    const sessionManagerId = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const stub = env.SESSION_MANAGER.get(sessionManagerId);

    const roleplayResponse = await stub.fetch(
      `http://internal/roleplay?roleplayId=${roleplayId}`,
    );
    const roleplayResult =
      (await roleplayResponse.json()) as ApiResponse<RoleplayData>;

    if (!roleplayResult.success || !roleplayResult.data?.meetingId) {
      return errorResponse("Meeting not found for this roleplay", 404);
    }

    // Use meetingId to find the agent (agents are named by meetingId)
    const agentId = env.INTERVIEW_AGENT.idFromName(
      roleplayResult.data.meetingId,
    );
    const agentStub = env.INTERVIEW_AGENT.get(agentId) as DurableObjectStub & {
      deinit: () => Promise<void>;
    };

    await agentStub.deinit();
    logger.info("Meeting ended", {
      roleplayId,
      meetingId: roleplayResult.data.meetingId,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    logger.error("Failed to end meeting", error);
    return errorResponse("Failed to end meeting");
  }
}

export async function handleGenerateReport(
  env: Env,
  roleplayId: string,
): Promise<Response> {
  const logger = new Logger("APIRoutes");

  try {
    // Get the roleplay data to find the meetingId
    const sessionManagerId = env.SESSION_MANAGER.idFromName(SESSION_MANAGER_ID);
    const stub = env.SESSION_MANAGER.get(sessionManagerId);

    const roleplayResponse = await stub.fetch(
      `http://internal/roleplay?roleplayId=${roleplayId}`,
    );
    const roleplayResult =
      (await roleplayResponse.json()) as ApiResponse<RoleplayData>;

    if (!roleplayResult.success || !roleplayResult.data?.meetingId) {
      return errorResponse("Roleplay not found or meeting not started", 404);
    }

    // Get the agent and generate report
    const agentId = env.INTERVIEW_AGENT.idFromName(
      roleplayResult.data.meetingId,
    );
    const agentStub = env.INTERVIEW_AGENT.get(agentId) as DurableObjectStub & {
      generateReport: () => Promise<InterviewReport>;
    };

    logger.info("Generating report", {
      roleplayId,
      meetingId: roleplayResult.data.meetingId,
    });

    const report = await agentStub.generateReport();

    logger.info("Report generated successfully", {
      roleplayId,
      overallScore: report.overallScore,
    });

    return jsonResponse<InterviewReport>(report);
  } catch (error) {
    logger.error("Failed to generate report", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate report",
      500,
    );
  }
}
