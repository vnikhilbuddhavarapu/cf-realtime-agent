/**
 * Document Chunker - Splits parsed documents into semantic chunks for embedding
 */

import type {
  DocumentChunk,
  ChunkMetadata,
  ChunkType,
  DocumentSource,
  ParsedResume,
  ParsedJobDescription,
} from "./types";

// Logger helper
const log = (level: string, message: string, data?: unknown) => {
  console.log(
    JSON.stringify({
      level,
      component: "RAGChunker",
      message,
      data,
      timestamp: Date.now(),
    }),
  );
};

// Generate unique chunk ID
function generateChunkId(
  roleplayId: string,
  source: DocumentSource,
  index: number,
): string {
  return `${roleplayId}-${source}-${index}`;
}

// Create a chunk with metadata
function createChunk(
  roleplayId: string,
  source: DocumentSource,
  chunkType: ChunkType,
  text: string,
  index: number,
  extraMetadata?: Partial<ChunkMetadata>,
): DocumentChunk {
  return {
    id: generateChunkId(roleplayId, source, index),
    text: text.trim(),
    metadata: {
      roleplayId,
      source,
      chunkType,
      chunkIndex: index,
      ...extraMetadata,
    },
  };
}

/**
 * Chunk a parsed resume into semantic pieces
 */
export function chunkResume(
  resume: ParsedResume,
  roleplayId: string,
): DocumentChunk[] {
  log("info", "Chunking resume", { roleplayId, name: resume.name });

  const chunks: DocumentChunk[] = [];
  let index = 0;

  // Summary chunk
  if (resume.summary) {
    chunks.push(
      createChunk(roleplayId, "resume", "summary", resume.summary, index++),
    );
  }

  // Experience chunks - one per job
  for (const exp of resume.experiences) {
    const expText = `
Role: ${exp.role} at ${exp.company}
Duration: ${exp.duration}
Key Highlights:
${exp.highlights.map((h) => `- ${h}`).join("\n")}
Skills Used: ${exp.skills.join(", ")}
    `.trim();

    chunks.push(
      createChunk(roleplayId, "resume", "experience", expText, index++, {
        company: exp.company,
        role: exp.role,
        skills: exp.skills,
        timeframe: exp.duration,
      }),
    );
  }

  // Education chunks
  for (const edu of resume.education) {
    const eduText = `${edu.degree} from ${edu.institution}${edu.year ? ` (${edu.year})` : ""}`;
    chunks.push(
      createChunk(roleplayId, "resume", "education", eduText, index++),
    );
  }

  // Skills chunk - combined
  if (resume.skills.technical.length > 0 || resume.skills.soft.length > 0) {
    const skillsText = `
Technical Skills: ${resume.skills.technical.join(", ")}
Soft Skills: ${resume.skills.soft.join(", ")}
    `.trim();
    chunks.push(
      createChunk(roleplayId, "resume", "skill", skillsText, index++, {
        skills: [...resume.skills.technical, ...resume.skills.soft],
      }),
    );
  }

  // Project chunks
  for (const project of resume.projects) {
    const projectText = `
Project: ${project.name}
Description: ${project.description}
Technologies: ${project.technologies.join(", ")}
    `.trim();
    chunks.push(
      createChunk(roleplayId, "resume", "project", projectText, index++, {
        skills: project.technologies,
      }),
    );
  }

  // Achievements chunk
  if (resume.achievements.length > 0) {
    const achievementsText = `Achievements and Certifications:\n${resume.achievements.map((a) => `- ${a}`).join("\n")}`;
    chunks.push(
      createChunk(
        roleplayId,
        "resume",
        "achievement",
        achievementsText,
        index++,
      ),
    );
  }

  log("info", "Resume chunking complete", {
    roleplayId,
    chunkCount: chunks.length,
  });

  return chunks;
}

/**
 * Chunk a parsed job description into semantic pieces
 */
export function chunkJobDescription(
  jd: ParsedJobDescription,
  roleplayId: string,
): DocumentChunk[] {
  log("info", "Chunking job description", {
    roleplayId,
    company: jd.company,
    role: jd.roleTitle,
  });

  const chunks: DocumentChunk[] = [];
  let index = 0;

  // Company/Role info chunk
  if (jd.company || jd.roleTitle) {
    const infoText = `
Company: ${jd.company || "Unknown"}
Role: ${jd.roleTitle || "Unknown"}
Level: ${jd.level || "Not specified"}
    `.trim();
    chunks.push(
      createChunk(
        roleplayId,
        "job_description",
        "company_info",
        infoText,
        index++,
        {
          company: jd.company,
          role: jd.roleTitle,
        },
      ),
    );
  }

  // Must-have requirements chunk
  if (jd.requirements.mustHave.length > 0) {
    const mustHaveText = `Required Qualifications:\n${jd.requirements.mustHave.map((r) => `- ${r}`).join("\n")}`;
    chunks.push(
      createChunk(
        roleplayId,
        "job_description",
        "requirement",
        mustHaveText,
        index++,
      ),
    );
  }

  // Nice-to-have requirements chunk
  if (jd.requirements.niceToHave.length > 0) {
    const niceToHaveText = `Preferred Qualifications:\n${jd.requirements.niceToHave.map((r) => `- ${r}`).join("\n")}`;
    chunks.push(
      createChunk(
        roleplayId,
        "job_description",
        "requirement",
        niceToHaveText,
        index++,
      ),
    );
  }

  // Responsibilities chunk
  if (jd.responsibilities.length > 0) {
    const respText = `Key Responsibilities:\n${jd.responsibilities.map((r) => `- ${r}`).join("\n")}`;
    chunks.push(
      createChunk(
        roleplayId,
        "job_description",
        "responsibility",
        respText,
        index++,
      ),
    );
  }

  // Tech stack chunk
  if (jd.techStack.length > 0) {
    const techText = `Tech Stack: ${jd.techStack.join(", ")}`;
    chunks.push(
      createChunk(roleplayId, "job_description", "skill", techText, index++, {
        skills: jd.techStack,
      }),
    );
  }

  // Culture chunk
  if (jd.culture.length > 0) {
    const cultureText = `Company Culture:\n${jd.culture.map((c) => `- ${c}`).join("\n")}`;
    chunks.push(
      createChunk(roleplayId, "job_description", "other", cultureText, index++),
    );
  }

  log("info", "Job description chunking complete", {
    roleplayId,
    chunkCount: chunks.length,
  });

  return chunks;
}

/**
 * Chunk raw text into overlapping segments (fallback for unparsed content)
 */
export function chunkRawText(
  text: string,
  roleplayId: string,
  source: DocumentSource,
  chunkSize: number = 500,
  overlap: number = 100,
): DocumentChunk[] {
  log("info", "Chunking raw text", {
    roleplayId,
    source,
    textLength: text.length,
    chunkSize,
    overlap,
  });

  const chunks: DocumentChunk[] = [];
  let index = 0;
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.substring(start, end).trim();

    if (chunkText.length > 0) {
      chunks.push(createChunk(roleplayId, source, "other", chunkText, index++));
    }

    start += chunkSize - overlap;
  }

  log("info", "Raw text chunking complete", {
    roleplayId,
    chunkCount: chunks.length,
  });

  return chunks;
}
