import { Logger } from "../utils/logger";
import type {
  Env,
  InterviewReport,
  CategoryScore,
  TranscriptEntry,
  ScenarioConfig,
  PersonaConfig,
} from "../types";

interface ReportGeneratorConfig {
  roleplayId: string;
  scenario: ScenarioConfig;
  persona: PersonaConfig;
  transcript: TranscriptEntry[];
  startTime: number;
  endTime: number;
}

export class ReportGenerator {
  private logger: Logger;
  private env: Env;
  private config: ReportGeneratorConfig;

  constructor(env: Env, config: ReportGeneratorConfig) {
    this.env = env;
    this.config = config;
    this.logger = new Logger("ReportGenerator");
  }

  async generateReport(): Promise<InterviewReport> {
    this.logger.info("Starting report generation", {
      roleplayId: this.config.roleplayId,
      transcriptLength: this.config.transcript.length,
    });

    const transcriptText = this.formatTranscript();
    const duration = Math.floor(
      (this.config.endTime - this.config.startTime) / 1000,
    );

    // Generate all analysis in parallel for speed
    const [scores, feedback, starAnalysis, summary] = await Promise.all([
      this.generateScores(transcriptText),
      this.generateFeedback(transcriptText),
      this.generateSTARAnalysis(transcriptText),
      this.generateSummary(transcriptText),
    ]);

    const report: InterviewReport = {
      id: crypto.randomUUID(),
      roleplayId: this.config.roleplayId,
      generatedAt: Date.now(),
      scenario: this.config.scenario,
      persona: this.config.persona,
      duration,
      overallScore: scores.overall,
      categoryScores: scores.categories,
      strengths: feedback.strengths,
      areasForImprovement: feedback.improvements,
      actionableTips: feedback.tips,
      starAnalysis:
        this.config.scenario.id === "behavioral" ? starAnalysis : undefined,
      transcript: this.config.transcript,
      summary,
    };

    this.logger.info("Report generated successfully", {
      roleplayId: this.config.roleplayId,
      overallScore: report.overallScore,
    });

    return report;
  }

  private formatTranscript(): string {
    if (this.config.transcript.length === 0) {
      return "No transcript available - interview was very short.";
    }

    return this.config.transcript
      .map((entry) => `${entry.speakerName}: ${entry.text}`)
      .join("\n");
  }

  private async generateScores(transcript: string): Promise<{
    overall: number;
    categories: CategoryScore[];
  }> {
    const prompt = `You are an expert interview coach analyzing an interview transcript.

Interview Type: ${this.config.scenario.name}
Difficulty: ${this.config.scenario.difficulty}
Focus Areas: ${this.config.scenario.focusAreas.join(", ")}

Transcript:
${transcript}

Analyze the candidate's performance and provide scores (1-10) for each category.
Even if the transcript is short, provide your best assessment based on available data.

Respond in JSON format ONLY:
{
  "overall": <number 1-10>,
  "categories": [
    {"category": "Communication", "score": <1-10>, "feedback": "<brief feedback>"},
    {"category": "Clarity", "score": <1-10>, "feedback": "<brief feedback>"},
    {"category": "Confidence", "score": <1-10>, "feedback": "<brief feedback>"},
    {"category": "Relevance", "score": <1-10>, "feedback": "<brief feedback>"},
    {"category": "Engagement", "score": <1-10>, "feedback": "<brief feedback>"}
  ]
}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
        },
      );

      const result = (response as { response?: string }).response || "";
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          overall: Math.min(10, Math.max(1, parsed.overall || 5)),
          categories: parsed.categories || this.getDefaultCategories(),
        };
      }
    } catch (error) {
      this.logger.error("Failed to generate scores", error);
    }

    return {
      overall: 5,
      categories: this.getDefaultCategories(),
    };
  }

  private getDefaultCategories(): CategoryScore[] {
    return [
      {
        category: "Communication",
        score: 5,
        feedback: "Unable to fully assess",
      },
      { category: "Clarity", score: 5, feedback: "Unable to fully assess" },
      { category: "Confidence", score: 5, feedback: "Unable to fully assess" },
      { category: "Relevance", score: 5, feedback: "Unable to fully assess" },
      { category: "Engagement", score: 5, feedback: "Unable to fully assess" },
    ];
  }

  private async generateFeedback(transcript: string): Promise<{
    strengths: string[];
    improvements: string[];
    tips: string[];
  }> {
    const prompt = `You are an expert interview coach analyzing an interview transcript.

Interview Type: ${this.config.scenario.name}
Candidate: ${this.config.persona.candidateName}

Transcript:
${transcript}

Provide constructive feedback. Even if the transcript is short, give your best assessment.

Respond in JSON format ONLY:
{
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>", "<area 3>"],
  "tips": ["<actionable tip 1>", "<actionable tip 2>", "<actionable tip 3>"]
}

Each item should be a concise, specific statement (max 15 words).`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 400,
        },
      );

      const result = (response as { response?: string }).response || "";
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          strengths: parsed.strengths || ["Participated in the interview"],
          improvements: parsed.improvements || [
            "Provide more detailed responses",
          ],
          tips: parsed.tips || ["Practice with longer mock interviews"],
        };
      }
    } catch (error) {
      this.logger.error("Failed to generate feedback", error);
    }

    return {
      strengths: ["Participated in the interview"],
      improvements: ["Provide more detailed responses"],
      tips: ["Practice with longer mock interviews"],
    };
  }

  private async generateSTARAnalysis(transcript: string): Promise<{
    situationScore: number;
    taskScore: number;
    actionScore: number;
    resultScore: number;
    feedback: string;
  }> {
    const prompt = `You are an expert interview coach analyzing a behavioral interview for STAR framework usage.

STAR Framework:
- Situation: Did the candidate describe the context/background?
- Task: Did the candidate explain their specific responsibility?
- Action: Did the candidate detail the steps they took?
- Result: Did the candidate share the outcome with metrics if possible?

Transcript:
${transcript}

Score each STAR component (1-10) and provide brief feedback.

Respond in JSON format ONLY:
{
  "situationScore": <1-10>,
  "taskScore": <1-10>,
  "actionScore": <1-10>,
  "resultScore": <1-10>,
  "feedback": "<2-3 sentences about STAR usage>"
}`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
        },
      );

      const result = (response as { response?: string }).response || "";
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          situationScore: Math.min(10, Math.max(1, parsed.situationScore || 5)),
          taskScore: Math.min(10, Math.max(1, parsed.taskScore || 5)),
          actionScore: Math.min(10, Math.max(1, parsed.actionScore || 5)),
          resultScore: Math.min(10, Math.max(1, parsed.resultScore || 5)),
          feedback:
            parsed.feedback ||
            "STAR framework usage could not be fully assessed.",
        };
      }
    } catch (error) {
      this.logger.error("Failed to generate STAR analysis", error);
    }

    return {
      situationScore: 5,
      taskScore: 5,
      actionScore: 5,
      resultScore: 5,
      feedback:
        "STAR framework usage could not be fully assessed due to limited transcript.",
    };
  }

  private async generateSummary(transcript: string): Promise<string> {
    const prompt = `You are an expert interview coach. Write a brief 2-3 sentence summary of this interview.

Interview Type: ${this.config.scenario.name}
Interviewer: ${this.config.persona.interviewerName} (${this.config.persona.interviewerTitle})
Candidate: ${this.config.persona.candidateName}

Transcript:
${transcript}

Write a professional, encouraging summary that captures the key points of the interview.
If the transcript is short, acknowledge it was a brief session.`;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
        },
      );

      const result = (response as { response?: string }).response || "";
      return result.trim() || this.getDefaultSummary();
    } catch (error) {
      this.logger.error("Failed to generate summary", error);
    }

    return this.getDefaultSummary();
  }

  private getDefaultSummary(): string {
    return `${this.config.persona.candidateName} completed a ${this.config.scenario.name} interview with ${this.config.persona.interviewerName}. Review the detailed feedback above for specific areas to focus on in future practice sessions.`;
  }
}
