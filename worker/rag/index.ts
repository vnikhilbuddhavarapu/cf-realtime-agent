/**
 * RAG Module - Document processing and vector search for interview context
 */

// Export types
export type {
  DocumentSource,
  ChunkType,
  ChunkMetadata,
  DocumentChunk,
  ParsedResume,
  ParsedJobDescription,
  RAGResult,
  IndexingResult,
  RAGContext,
} from "./types";

// Export parser functions
export { extractTextFromPDF, parseResume, parseJobDescription } from "./parser";

// Export chunker functions
export { chunkResume, chunkJobDescription, chunkRawText } from "./chunker";

// Export main service functions
export {
  indexResume,
  indexJobDescription,
  queryContext,
  getInterviewContext,
  deleteRoleplayVectors,
} from "./service";
