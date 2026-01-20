import type { Env } from "./types";
import { InterviewAgent } from "./agents/InterviewAgent";
import { SessionManager } from "./sessions/SessionManager";
import { Logger } from "./utils/logger";
import { errorResponse } from "./utils/response";
import {
  handleCreateSession,
  handleGetSession,
  handleCreateRoleplay,
  handleStartMeeting,
  handleEndMeeting,
  handleGenerateReport,
  handleMeetingReady,
} from "./routes/api";
import {
  handleUploadResume,
  handleUploadJobDescription,
  handleQueryContext,
  handleGetInterviewContext,
  handleDeleteRoleplayVectors,
  handleRAGHealth,
} from "./routes/rag";

const logger = new Logger("Worker");

export { InterviewAgent, SessionManager };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    logger.info("Request received", { method: request.method, path });

    // RealtimeKit SDK internal routes - must use meetingId from query params
    if (path.startsWith("/agentsInternal")) {
      const meetingId = url.searchParams.get("meetingId");
      if (!meetingId) {
        return errorResponse("Missing meetingId", 400);
      }
      // Use meetingId to get the agent stub (we create agents with meetingId as the name)
      const agentId = env.INTERVIEW_AGENT.idFromName(meetingId);
      const stub = env.INTERVIEW_AGENT.get(agentId);
      return stub.fetch(request);
    }

    // WebSocket endpoint for real-time insights - forward to Durable Object
    if (
      path === "/api/insights/ws" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      const meetingId = url.searchParams.get("meetingId");
      if (!meetingId) {
        return errorResponse("Missing meetingId", 400);
      }

      // Forward the WebSocket upgrade request to the Durable Object
      // The DO will handle the WebSocket upgrade internally
      const agentId = env.INTERVIEW_AGENT.idFromName(meetingId);
      const stub = env.INTERVIEW_AGENT.get(agentId);

      // Create a new request with the insights path for the DO to handle
      const insightsUrl = new URL(request.url);
      insightsUrl.pathname = "/insights/ws";
      const insightsRequest = new Request(insightsUrl.toString(), request);

      return stub.fetch(insightsRequest);
    }

    if (path.startsWith("/api/")) {
      try {
        if (path === "/api/session" && request.method === "POST") {
          return await handleCreateSession(env);
        }

        if (path === "/api/session" && request.method === "GET") {
          const sessionId = url.searchParams.get("sessionId");
          if (!sessionId) {
            return errorResponse("Missing sessionId parameter", 400);
          }
          return await handleGetSession(env, sessionId);
        }

        if (path === "/api/roleplay" && request.method === "POST") {
          const body = (await request.json()) as {
            sessionId: string;
            scenario: {
              id: string;
              name: string;
              description: string;
              difficulty: string;
              duration: number;
              focusAreas: string[];
            };
            persona: {
              interviewerName: string;
              interviewerTitle: string;
              companyName: string;
              candidateName: string;
              demeanor: string;
              probingLevel: string;
              feedbackStyle: string;
              voiceId: string;
            };
            jobDescription?: string;
            resume?: string;
          };
          const { sessionId, scenario, persona, jobDescription, resume } = body;

          if (!sessionId || !scenario || !persona) {
            return errorResponse(
              "Missing required fields: sessionId, scenario, persona",
              400,
            );
          }

          return await handleCreateRoleplay(env, sessionId, {
            scenario: scenario as import("./types").ScenarioConfig,
            persona: persona as import("./types").PersonaConfig,
            jobDescription,
            resume,
          });
        }

        if (path === "/api/meeting/start" && request.method === "POST") {
          const body = (await request.json()) as { roleplayId: string };
          const { roleplayId } = body;
          if (!roleplayId) {
            return errorResponse("Missing roleplayId", 400);
          }
          return await handleStartMeeting(env, roleplayId, request);
        }

        if (path === "/api/meeting/end" && request.method === "POST") {
          const body = (await request.json()) as { roleplayId: string };
          const { roleplayId } = body;

          if (!roleplayId) {
            return errorResponse("Missing roleplayId", 400);
          }

          return await handleEndMeeting(env, roleplayId);
        }

        if (path === "/api/meeting/ready" && request.method === "GET") {
          const meetingId = url.searchParams.get("meetingId");
          if (!meetingId) {
            return errorResponse("Missing meetingId parameter", 400);
          }
          return await handleMeetingReady(env, meetingId);
        }

        if (path === "/api/report/generate" && request.method === "POST") {
          const body = (await request.json()) as { roleplayId: string };
          const { roleplayId } = body;

          if (!roleplayId) {
            return errorResponse("Missing roleplayId", 400);
          }

          return await handleGenerateReport(env, roleplayId);
        }

        // RAG Routes
        if (path === "/api/rag/health" && request.method === "GET") {
          return await handleRAGHealth(env);
        }

        if (path === "/api/rag/resume" && request.method === "POST") {
          return await handleUploadResume(env, request);
        }

        if (path === "/api/rag/job-description" && request.method === "POST") {
          return await handleUploadJobDescription(env, request);
        }

        if (path === "/api/rag/query" && request.method === "POST") {
          return await handleQueryContext(env, request);
        }

        if (
          path === "/api/rag/interview-context" &&
          request.method === "POST"
        ) {
          return await handleGetInterviewContext(env, request);
        }

        if (
          path.startsWith("/api/rag/roleplay/") &&
          request.method === "DELETE"
        ) {
          const roleplayId = path.split("/api/rag/roleplay/")[1];
          if (!roleplayId) {
            return errorResponse("Missing roleplayId", 400);
          }
          return await handleDeleteRoleplayVectors(env, roleplayId);
        }

        return errorResponse("API endpoint not found", 404);
      } catch (error) {
        logger.error("API request failed", error);
        return errorResponse(
          error instanceof Error ? error.message : "Internal server error",
          500,
        );
      }
    }

    return new Response(null, { status: 404 });
  },
} satisfies ExportedHandler<Env>;
