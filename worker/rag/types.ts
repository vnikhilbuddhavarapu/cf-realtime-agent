/**
 * RAG Types - Document processing and vector storage types
 */

// Document source types
export type DocumentSource = "resume" | "job_description";

// Chunk types for different content categories
export type ChunkType =
  | "experience"
  | "skill"
  | "education"
  | "project"
  | "achievement"
  | "requirement"
  | "responsibility"
  | "company_info"
  | "summary"
  | "other";

// Metadata stored with each vector
export interface ChunkMetadata {
  roleplayId: string;
  source: DocumentSource;
  chunkType: ChunkType;
  chunkIndex: number;
  // Optional contextual metadata
  company?: string;
  role?: string;
  skills?: string[];
  timeframe?: string;
}

// A document chunk ready for embedding
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

// Parsed resume structure
export interface ParsedResume {
  name?: string;
  email?: string;
  location?: string;
  summary?: string;
  experiences: {
    company: string;
    role: string;
    duration: string;
    highlights: string[];
    skills: string[];
  }[];
  education: {
    institution: string;
    degree: string;
    year?: string;
  }[];
  skills: {
    technical: string[];
    soft: string[];
  };
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
  achievements: string[];
  rawText: string;
}

// Parsed job description structure
export interface ParsedJobDescription {
  company?: string;
  roleTitle?: string;
  level?: string;
  requirements: {
    mustHave: string[];
    niceToHave: string[];
  };
  responsibilities: string[];
  techStack: string[];
  benefits: string[];
  culture: string[];
  rawText: string;
}

// RAG query result
export interface RAGResult {
  id: string;
  text: string;
  score: number;
  metadata: ChunkMetadata;
}

// Document indexing result
export interface IndexingResult {
  success: boolean;
  documentId: string;
  chunksIndexed: number;
  error?: string;
}

// RAG context for AI prompts
export interface RAGContext {
  resumeContext: RAGResult[];
  jdContext: RAGResult[];
  combinedContext: string;
}
