/**
 * Document Parser - Extracts text from PDFs and parses structured content
 * Uses unpdf for serverless-compatible PDF parsing
 */

import { getDocumentProxy, extractText } from "unpdf";
import type { ParsedResume, ParsedJobDescription } from "./types";

// Logger helper
const log = (level: string, message: string, data?: unknown) => {
  console.log(
    JSON.stringify({
      level,
      component: "RAGParser",
      message,
      data,
      timestamp: Date.now(),
    }),
  );
};

/**
 * Extract text from a PDF buffer
 */
export async function extractTextFromPDF(
  pdfBuffer: ArrayBuffer,
): Promise<string> {
  log("info", "Extracting text from PDF", { bufferSize: pdfBuffer.byteLength });

  try {
    const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
    const { text } = await extractText(pdf, { mergePages: true });

    log("info", "PDF text extraction complete", { textLength: text.length });
    return text;
  } catch (error) {
    log("error", "PDF extraction failed", { error: String(error) });
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

/**
 * Parse resume text into structured format using Workers AI
 */
export async function parseResume(text: string, ai: Ai): Promise<ParsedResume> {
  log("info", "Parsing resume with AI", { textLength: text.length });

  const prompt = `You are a resume parser. Extract structured information from the following resume text.
Return a JSON object with these fields (use empty arrays/strings if not found):
- name: string (candidate's full name)
- email: string (email address)
- location: string (city, state/country)
- summary: string (professional summary if present)
- experiences: array of { company: string, role: string, duration: string, highlights: string[], skills: string[] }
- education: array of { institution: string, degree: string, year: string }
- skills: { technical: string[], soft: string[] }
- projects: array of { name: string, description: string, technologies: string[] }
- achievements: string[] (notable achievements, awards, certifications)

Resume text:
${text.substring(0, 8000)}

Return ONLY valid JSON, no markdown or explanation.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 2000,
    });

    const responseText =
      typeof response === "object" && "response" in response
        ? (response as { response: string }).response
        : String(response);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log("warn", "No JSON found in AI response, using defaults");
      return createDefaultResume(text);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ParsedResume>;

    log("info", "Resume parsed successfully", {
      name: parsed.name,
      experienceCount: parsed.experiences?.length || 0,
      skillCount:
        (parsed.skills?.technical?.length || 0) +
        (parsed.skills?.soft?.length || 0),
    });

    return {
      name: parsed.name || "",
      email: parsed.email || "",
      location: parsed.location || "",
      summary: parsed.summary || "",
      experiences: parsed.experiences || [],
      education: parsed.education || [],
      skills: parsed.skills || { technical: [], soft: [] },
      projects: parsed.projects || [],
      achievements: parsed.achievements || [],
      rawText: text,
    };
  } catch (error) {
    log("error", "Resume parsing failed", { error: String(error) });
    return createDefaultResume(text);
  }
}

/**
 * Parse job description text into structured format using Workers AI
 */
export async function parseJobDescription(
  text: string,
  ai: Ai,
): Promise<ParsedJobDescription> {
  log("info", "Parsing job description with AI", { textLength: text.length });

  const prompt = `You are a job description parser. Extract structured information from the following job posting.
Return a JSON object with these fields (use empty arrays/strings if not found):
- company: string (company name)
- roleTitle: string (job title)
- level: string (junior/mid/senior/staff/principal)
- requirements: { mustHave: string[], niceToHave: string[] }
- responsibilities: string[] (key job responsibilities)
- techStack: string[] (technologies, tools, languages mentioned)
- benefits: string[] (perks, benefits mentioned)
- culture: string[] (company culture signals)

Job description text:
${text.substring(0, 8000)}

Return ONLY valid JSON, no markdown or explanation.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (ai as any).run("@cf/meta/llama-3.1-8b-instruct", {
      prompt,
      max_tokens: 2000,
    });

    const responseText =
      typeof response === "object" && "response" in response
        ? (response as { response: string }).response
        : String(response);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log("warn", "No JSON found in AI response, using defaults");
      return createDefaultJobDescription(text);
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ParsedJobDescription>;

    log("info", "Job description parsed successfully", {
      company: parsed.company,
      roleTitle: parsed.roleTitle,
      requirementCount:
        (parsed.requirements?.mustHave?.length || 0) +
        (parsed.requirements?.niceToHave?.length || 0),
    });

    return {
      company: parsed.company || "",
      roleTitle: parsed.roleTitle || "",
      level: parsed.level || "",
      requirements: parsed.requirements || { mustHave: [], niceToHave: [] },
      responsibilities: parsed.responsibilities || [],
      techStack: parsed.techStack || [],
      benefits: parsed.benefits || [],
      culture: parsed.culture || [],
      rawText: text,
    };
  } catch (error) {
    log("error", "Job description parsing failed", { error: String(error) });
    return createDefaultJobDescription(text);
  }
}

// Helper to create default resume when parsing fails
function createDefaultResume(text: string): ParsedResume {
  return {
    name: "",
    email: "",
    location: "",
    summary: "",
    experiences: [],
    education: [],
    skills: { technical: [], soft: [] },
    projects: [],
    achievements: [],
    rawText: text,
  };
}

// Helper to create default JD when parsing fails
function createDefaultJobDescription(text: string): ParsedJobDescription {
  return {
    company: "",
    roleTitle: "",
    level: "",
    requirements: { mustHave: [], niceToHave: [] },
    responsibilities: [],
    techStack: [],
    benefits: [],
    culture: [],
    rawText: text,
  };
}
