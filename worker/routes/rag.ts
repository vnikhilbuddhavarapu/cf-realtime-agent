/**
 * RAG API Routes - Document upload and context retrieval
 */

import type { Env } from "../types";
import { Logger } from "../utils/logger";
import { jsonResponse, errorResponse } from "../utils/response";
import {
  indexResume,
  indexJobDescription,
  queryContext,
  getInterviewContext,
  deleteRoleplayVectors,
} from "../rag";

const logger = new Logger("RAGRoutes");

/**
 * Handle resume upload and indexing
 * POST /api/rag/resume
 * Body: { roleplayId: string, content: string } or FormData with PDF
 */
export async function handleUploadResume(
  env: Env,
  request: Request,
): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") || "";

    let roleplayId: string;
    let content: string | ArrayBuffer;

    if (contentType.includes("multipart/form-data")) {
      // Handle PDF upload
      const formData = await request.formData();
      roleplayId = formData.get("roleplayId") as string;
      const file = formData.get("file") as File;

      if (!roleplayId || !file) {
        return errorResponse("Missing roleplayId or file", 400);
      }

      content = await file.arrayBuffer();
      logger.info("Processing PDF resume upload", {
        roleplayId,
        fileName: file.name,
        size: content.byteLength,
      });
    } else {
      // Handle JSON with text content
      const body = (await request.json()) as {
        roleplayId: string;
        content: string;
      };
      roleplayId = body.roleplayId;
      content = body.content;

      if (!roleplayId || !content) {
        return errorResponse("Missing roleplayId or content", 400);
      }

      logger.info("Processing text resume upload", {
        roleplayId,
        contentLength: content.length,
      });
    }

    // Index the resume
    const result = await indexResume(content, roleplayId, env);

    logger.info("Resume indexing complete", {
      roleplayId,
      success: result.success,
      chunksIndexed: result.chunksIndexed,
    });

    return jsonResponse(result);
  } catch (error) {
    logger.error("Resume upload failed", error);
    return errorResponse(
      error instanceof Error ? error.message : "Resume upload failed",
      500,
    );
  }
}

/**
 * Handle job description upload and indexing
 * POST /api/rag/job-description
 * Body: { roleplayId: string, content: string } or FormData with PDF
 */
export async function handleUploadJobDescription(
  env: Env,
  request: Request,
): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") || "";

    let roleplayId: string;
    let content: string | ArrayBuffer;

    if (contentType.includes("multipart/form-data")) {
      // Handle PDF upload
      const formData = await request.formData();
      roleplayId = formData.get("roleplayId") as string;
      const file = formData.get("file") as File;

      if (!roleplayId || !file) {
        return errorResponse("Missing roleplayId or file", 400);
      }

      content = await file.arrayBuffer();
      logger.info("Processing PDF job description upload", {
        roleplayId,
        fileName: file.name,
        size: content.byteLength,
      });
    } else {
      // Handle JSON with text content
      const body = (await request.json()) as {
        roleplayId: string;
        content: string;
      };
      roleplayId = body.roleplayId;
      content = body.content;

      if (!roleplayId || !content) {
        return errorResponse("Missing roleplayId or content", 400);
      }

      logger.info("Processing text job description upload", {
        roleplayId,
        contentLength: content.length,
      });
    }

    // Index the job description
    const result = await indexJobDescription(content, roleplayId, env);

    logger.info("Job description indexing complete", {
      roleplayId,
      success: result.success,
      chunksIndexed: result.chunksIndexed,
    });

    return jsonResponse(result);
  } catch (error) {
    logger.error("Job description upload failed", error);
    return errorResponse(
      error instanceof Error ? error.message : "Job description upload failed",
      500,
    );
  }
}

/**
 * Query RAG context for a given question
 * POST /api/rag/query
 * Body: { roleplayId: string, query: string, source?: "resume" | "job_description", topK?: number }
 */
export async function handleQueryContext(
  env: Env,
  request: Request,
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      roleplayId: string;
      query: string;
      source?: "resume" | "job_description";
      topK?: number;
    };

    if (!body.roleplayId || !body.query) {
      return errorResponse("Missing roleplayId or query", 400);
    }

    logger.info("Querying RAG context", {
      roleplayId: body.roleplayId,
      query: body.query.substring(0, 100),
      source: body.source,
      topK: body.topK,
    });

    const results = await queryContext(body.query, body.roleplayId, env, {
      source: body.source,
      topK: body.topK,
    });

    return jsonResponse({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    logger.error("RAG query failed", error);
    return errorResponse(
      error instanceof Error ? error.message : "RAG query failed",
      500,
    );
  }
}

/**
 * Get full interview context for a question
 * POST /api/rag/interview-context
 * Body: { roleplayId: string, question: string }
 */
export async function handleGetInterviewContext(
  env: Env,
  request: Request,
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      roleplayId: string;
      question: string;
    };

    if (!body.roleplayId || !body.question) {
      return errorResponse("Missing roleplayId or question", 400);
    }

    logger.info("Getting interview context", {
      roleplayId: body.roleplayId,
      question: body.question.substring(0, 100),
    });

    const context = await getInterviewContext(
      body.question,
      body.roleplayId,
      env,
    );

    return jsonResponse({
      success: true,
      context,
    });
  } catch (error) {
    logger.error("Interview context retrieval failed", error);
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Interview context retrieval failed",
      500,
    );
  }
}

/**
 * Delete all vectors for a roleplay (cleanup)
 * DELETE /api/rag/roleplay/:roleplayId
 */
export async function handleDeleteRoleplayVectors(
  env: Env,
  roleplayId: string,
): Promise<Response> {
  try {
    logger.info("Deleting roleplay vectors", { roleplayId });

    const result = await deleteRoleplayVectors(roleplayId, env);

    return jsonResponse({
      success: true,
      deleted: result.deleted,
    });
  } catch (error) {
    logger.error("Vector deletion failed", error);
    return errorResponse(
      error instanceof Error ? error.message : "Vector deletion failed",
      500,
    );
  }
}

/**
 * Test endpoint to verify RAG is working
 * GET /api/rag/health
 */
export async function handleRAGHealth(env: Env): Promise<Response> {
  try {
    // Try to describe the Vectorize index
    const info = await env.VECTORIZE.describe();

    return jsonResponse({
      success: true,
      vectorize: {
        // VectorizeIndexInfo structure varies, use safe access
        vectorCount: info.vectorCount,
        info: info,
      },
    });
  } catch (error) {
    logger.error("RAG health check failed", error);
    return errorResponse(
      error instanceof Error ? error.message : "RAG health check failed",
      500,
    );
  }
}
