/**
 * RAG Service - Main service for document indexing and retrieval
 * Uses Cloudflare Vectorize with bge-large-en-v1.5 embeddings (1024 dimensions)
 */

import type { Env } from "../types";
import type {
  DocumentChunk,
  DocumentSource,
  IndexingResult,
  RAGResult,
  RAGContext,
} from "./types";
import { extractTextFromPDF, parseResume, parseJobDescription } from "./parser";
import { chunkResume, chunkJobDescription, chunkRawText } from "./chunker";

// Embedding model: bge-large-en-v1.5 produces 1024-dimensional vectors
const EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5";

// Logger helper
const log = (level: string, message: string, data?: unknown) => {
  console.log(
    JSON.stringify({
      level,
      component: "RAGService",
      message,
      data,
      timestamp: Date.now(),
    }),
  );
};

/**
 * Generate embeddings for text using Workers AI
 */
async function generateEmbedding(text: string, ai: Ai): Promise<number[]> {
  log("debug", "Generating embedding", { textLength: text.length });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai as any).run(EMBEDDING_MODEL, {
      text: [text],
    });

    if (!response?.data?.[0]) {
      throw new Error("No embedding returned from AI");
    }

    log("debug", "Embedding generated", {
      dimensions: response.data[0].length,
    });

    return response.data[0];
  } catch (error) {
    log("error", "Embedding generation failed", { error: String(error) });
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateEmbeddings(
  texts: string[],
  ai: Ai,
): Promise<number[][]> {
  log("info", "Generating batch embeddings", { count: texts.length });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai as any).run(EMBEDDING_MODEL, {
      text: texts,
    });

    if (!response?.data) {
      throw new Error("No embeddings returned from AI");
    }

    log("info", "Batch embeddings generated", {
      count: response.data.length,
      dimensions: response.data[0]?.length,
    });

    return response.data;
  } catch (error) {
    log("error", "Batch embedding generation failed", { error: String(error) });
    throw error;
  }
}

/**
 * Index document chunks into Vectorize
 */
async function indexChunks(
  chunks: DocumentChunk[],
  env: Env,
): Promise<{ indexed: number; errors: string[] }> {
  log("info", "Indexing chunks to Vectorize", { chunkCount: chunks.length });

  const errors: string[] = [];
  let indexed = 0;

  // Process in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    try {
      // Generate embeddings for batch
      const texts = batch.map((c) => c.text);
      const embeddings = await generateEmbeddings(texts, env.AI);

      // Prepare vectors for Vectorize
      const vectors: VectorizeVector[] = batch.map((chunk, idx) => ({
        id: chunk.id,
        values: embeddings[idx],
        metadata: chunk.metadata as unknown as Record<
          string,
          VectorizeVectorMetadata
        >,
      }));

      // Insert into Vectorize
      await env.VECTORIZE.insert(vectors);
      indexed += batch.length;

      log("debug", "Batch indexed successfully", {
        batchStart: i,
        batchSize: batch.length,
        totalIndexed: indexed,
      });
    } catch (error) {
      const errorMsg = `Failed to index batch starting at ${i}: ${error}`;
      log("error", "Batch indexing failed", {
        error: String(error),
        batchStart: i,
      });
      errors.push(errorMsg);
    }
  }

  log("info", "Indexing complete", { indexed, errorCount: errors.length });

  return { indexed, errors };
}

/**
 * Process and index a resume document
 */
export async function indexResume(
  content: string | ArrayBuffer,
  roleplayId: string,
  env: Env,
): Promise<IndexingResult> {
  log("info", "Processing resume for indexing", { roleplayId });

  try {
    // Extract text if PDF
    let text: string;
    if (content instanceof ArrayBuffer) {
      text = await extractTextFromPDF(content);
    } else {
      text = content;
    }

    // Parse resume structure
    const parsed = await parseResume(text, env.AI);

    // Chunk the parsed resume
    const chunks = chunkResume(parsed, roleplayId);

    // If no structured chunks, fall back to raw text chunking
    if (chunks.length === 0) {
      log("warn", "No structured chunks, using raw text chunking");
      const rawChunks = chunkRawText(text, roleplayId, "resume");
      const result = await indexChunks(rawChunks, env);
      return {
        success: result.errors.length === 0,
        documentId: `${roleplayId}-resume`,
        chunksIndexed: result.indexed,
        error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
      };
    }

    // Index chunks
    const result = await indexChunks(chunks, env);

    return {
      success: result.errors.length === 0,
      documentId: `${roleplayId}-resume`,
      chunksIndexed: result.indexed,
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (error) {
    log("error", "Resume indexing failed", {
      roleplayId,
      error: String(error),
    });
    return {
      success: false,
      documentId: `${roleplayId}-resume`,
      chunksIndexed: 0,
      error: String(error),
    };
  }
}

/**
 * Process and index a job description document
 */
export async function indexJobDescription(
  content: string | ArrayBuffer,
  roleplayId: string,
  env: Env,
): Promise<IndexingResult> {
  log("info", "Processing job description for indexing", { roleplayId });

  try {
    // Extract text if PDF
    let text: string;
    if (content instanceof ArrayBuffer) {
      text = await extractTextFromPDF(content);
    } else {
      text = content;
    }

    // Parse JD structure
    const parsed = await parseJobDescription(text, env.AI);

    // Chunk the parsed JD
    const chunks = chunkJobDescription(parsed, roleplayId);

    // If no structured chunks, fall back to raw text chunking
    if (chunks.length === 0) {
      log("warn", "No structured chunks, using raw text chunking");
      const rawChunks = chunkRawText(text, roleplayId, "job_description");
      const result = await indexChunks(rawChunks, env);
      return {
        success: result.errors.length === 0,
        documentId: `${roleplayId}-jd`,
        chunksIndexed: result.indexed,
        error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
      };
    }

    // Index chunks
    const result = await indexChunks(chunks, env);

    return {
      success: result.errors.length === 0,
      documentId: `${roleplayId}-jd`,
      chunksIndexed: result.indexed,
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (error) {
    log("error", "Job description indexing failed", {
      roleplayId,
      error: String(error),
    });
    return {
      success: false,
      documentId: `${roleplayId}-jd`,
      chunksIndexed: 0,
      error: String(error),
    };
  }
}

/**
 * Query Vectorize for relevant context
 */
export async function queryContext(
  query: string,
  roleplayId: string,
  env: Env,
  options: {
    source?: DocumentSource;
    topK?: number;
  } = {},
): Promise<RAGResult[]> {
  const { source, topK = 5 } = options;

  log("info", "Querying RAG context", {
    roleplayId,
    query: query.substring(0, 100),
    source,
    topK,
  });

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query, env.AI);

    // Build filter for roleplayId (and optionally source)
    const filter: VectorizeVectorMetadataFilter = {
      roleplayId: { $eq: roleplayId },
    };
    if (source) {
      filter.source = { $eq: source };
    }

    // Query Vectorize
    const results = await env.VECTORIZE.query(queryEmbedding, {
      topK,
      filter,
      returnValues: false,
      returnMetadata: "all",
    });

    log("info", "RAG query complete", {
      roleplayId,
      matchCount: results.matches.length,
    });

    // Map to RAGResult format
    return results.matches.map((match) => {
      const metadata = match.metadata as unknown as RAGResult["metadata"];
      const textSnippet =
        typeof metadata?.textSnippet === "string" ? metadata.textSnippet : "";

      return {
        id: match.id,
        text: textSnippet,
        score: match.score,
        metadata,
      };
    });
  } catch (error) {
    log("error", "RAG query failed", { roleplayId, error: String(error) });
    return [];
  }
}

/**
 * Get full RAG context for an interview question
 * Returns relevant resume and JD context combined
 */
export async function getInterviewContext(
  question: string,
  roleplayId: string,
  env: Env,
): Promise<RAGContext> {
  log("info", "Getting interview context", {
    roleplayId,
    question: question.substring(0, 100),
  });

  // Query both resume and JD in parallel
  const [resumeResults, jdResults] = await Promise.all([
    queryContext(question, roleplayId, env, { source: "resume", topK: 3 }),
    queryContext(question, roleplayId, env, {
      source: "job_description",
      topK: 2,
    }),
  ]);

  // Build combined context string for AI prompt
  let combinedContext = "";

  if (resumeResults.length > 0) {
    combinedContext += "## Relevant Candidate Experience\n";
    resumeResults.forEach((r, i) => {
      combinedContext += `${i + 1}. [${r.metadata.chunkType}] Score: ${r.score.toFixed(3)}\n`;
      if (r.metadata.company)
        combinedContext += `   Company: ${r.metadata.company}\n`;
      if (r.metadata.role) combinedContext += `   Role: ${r.metadata.role}\n`;
      if (r.text) combinedContext += `   Snippet: ${r.text}\n`;
    });
    combinedContext += "\n";
  }

  if (jdResults.length > 0) {
    combinedContext += "## Relevant Job Requirements\n";
    jdResults.forEach((r, i) => {
      combinedContext += `${i + 1}. [${r.metadata.chunkType}] Score: ${r.score.toFixed(3)}\n`;
      if (r.text) combinedContext += `   Snippet: ${r.text}\n`;
    });
  }

  log("info", "Interview context built", {
    roleplayId,
    resumeMatches: resumeResults.length,
    jdMatches: jdResults.length,
  });

  return {
    resumeContext: resumeResults,
    jdContext: jdResults,
    combinedContext,
  };
}

/**
 * Delete all vectors for a roleplay (cleanup)
 */
export async function deleteRoleplayVectors(
  roleplayId: string,
  env: Env,
): Promise<{ deleted: number }> {
  log("info", "Deleting roleplay vectors", { roleplayId });

  try {
    // Query all vectors for this roleplay to get IDs
    const dummyEmbedding = new Array(1024).fill(0);
    const results = await env.VECTORIZE.query(dummyEmbedding, {
      topK: 100,
      filter: { roleplayId: { $eq: roleplayId } },
      returnValues: false,
      returnMetadata: "none",
    });

    if (results.matches.length === 0) {
      log("info", "No vectors found to delete", { roleplayId });
      return { deleted: 0 };
    }

    // Delete by IDs
    const ids = results.matches.map((m) => m.id);
    await env.VECTORIZE.deleteByIds(ids);

    log("info", "Vectors deleted", { roleplayId, deleted: ids.length });
    return { deleted: ids.length };
  } catch (error) {
    log("error", "Vector deletion failed", {
      roleplayId,
      error: String(error),
    });
    return { deleted: 0 };
  }
}
