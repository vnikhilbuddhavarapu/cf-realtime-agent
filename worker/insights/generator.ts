import { Logger } from "../utils/logger";
import { getInterviewContext } from "../rag/service";
import type {
  Env,
  Insight,
  InsightType,
  InsightPriority,
  QuestionType,
  STARProgress,
  TranscriptEntry,
  InsightsWSMessage,
  PersonaConfig,
  ScenarioConfig,
} from "../types";

const INSIGHT_RATE_LIMIT_MS = 10000; // 10 seconds between insights

interface InsightGeneratorConfig {
  roleplayId: string;
  persona: PersonaConfig;
  scenario: ScenarioConfig;
}

export class InsightGenerator {
  private logger: Logger;
  private env: Env;
  private config: InsightGeneratorConfig;

  private currentQuestionType: QuestionType = "unknown";
  private starProgress: STARProgress = {
    situation: false,
    task: false,
    action: false,
    result: false,
  };
  private lastInsightTime: number = 0;
  private insights: Insight[] = [];
  private transcript: TranscriptEntry[] = [];
  private currentInterviewerQuestion: string = "";
  private wsConnections: Set<WebSocket> = new Set();

  constructor(env: Env, config: InsightGeneratorConfig) {
    this.env = env;
    this.config = config;
    this.logger = new Logger("InsightGenerator");
  }

  addWebSocket(ws: WebSocket): void {
    this.wsConnections.add(ws);
    this.logger.info("WebSocket added to InsightGenerator", {
      roleplayId: this.config.roleplayId,
      connectionCount: this.wsConnections.size,
    });

    // Send current state to new connection
    this.sendToWS(ws, {
      type: "connected",
      roleplayId: this.config.roleplayId,
    });
    this.sendToWS(ws, {
      type: "question_type",
      data: this.currentQuestionType,
    });
    this.sendToWS(ws, { type: "star_progress", data: this.starProgress });

    // Send recent insights
    this.insights.slice(-5).forEach((insight) => {
      this.sendToWS(ws, { type: "insight", data: insight });
    });
  }

  removeWebSocket(ws: WebSocket): void {
    this.wsConnections.delete(ws);
    this.logger.info("WebSocket removed from InsightGenerator", {
      roleplayId: this.config.roleplayId,
      connectionCount: this.wsConnections.size,
    });
  }

  private sendToWS(ws: WebSocket, message: InsightsWSMessage): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (error) {
      this.logger.error("Failed to send WebSocket message", error);
    }
  }

  private broadcast(message: InsightsWSMessage): void {
    this.wsConnections.forEach((ws) => this.sendToWS(ws, message));
  }

  async processInterviewerUtterance(text: string): Promise<void> {
    this.logger.info("Processing interviewer utterance", {
      roleplayId: this.config.roleplayId,
      textLength: text.length,
    });

    // Store as current question
    this.currentInterviewerQuestion = text;

    // Add to transcript
    const entry: TranscriptEntry = {
      id: crypto.randomUUID(),
      roleplayId: this.config.roleplayId,
      timestamp: Date.now(),
      speaker: "interviewer",
      speakerName: this.config.persona.interviewerName,
      text,
      isPartial: false,
    };
    this.transcript.push(entry);
    this.broadcast({ type: "transcript", data: entry });

    // Classify the question type
    await this.classifyQuestion(text);

    // Reset STAR progress for new question (if it's a behavioral question)
    if (this.currentQuestionType === "behavioral") {
      this.starProgress = {
        situation: false,
        task: false,
        action: false,
        result: false,
      };
      this.broadcast({ type: "star_progress", data: this.starProgress });
    }
  }

  async processUserUtterance(text: string): Promise<void> {
    this.logger.info("Processing user utterance", {
      roleplayId: this.config.roleplayId,
      textLength: text.length,
      questionType: this.currentQuestionType,
    });

    // Add to transcript
    const entry: TranscriptEntry = {
      id: crypto.randomUUID(),
      roleplayId: this.config.roleplayId,
      timestamp: Date.now(),
      speaker: "user",
      speakerName: this.config.persona.candidateName,
      text,
      isPartial: false,
    };
    this.transcript.push(entry);
    this.broadcast({ type: "transcript", data: entry });

    // Update STAR progress if behavioral question
    if (this.currentQuestionType === "behavioral") {
      await this.updateSTARProgress(text);
    }

    // Check if we should generate an insight (rate limited)
    const now = Date.now();
    if (now - this.lastInsightTime >= INSIGHT_RATE_LIMIT_MS) {
      await this.generateInsight(text);
    }
  }

  private async classifyQuestion(question: string): Promise<void> {
    try {
      const prompt = `Classify this interview question into ONE category.

Question: "${question}"

Categories:
- behavioral: Questions about past experiences, "Tell me about a time...", STAR-format expected
- technical: Questions about technical skills, coding, system design, algorithms
- situational: Hypothetical scenarios, "What would you do if..."
- competency: Questions about specific skills or abilities
- motivation: Questions about career goals, why this role/company
- unknown: Cannot determine

Respond with ONLY the category name, nothing else.`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiResponse = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
        },
      );

      const result =
        (aiResponse as { response?: string }).response?.toLowerCase().trim() ||
        "unknown";

      // Map to valid QuestionType
      const validTypes: QuestionType[] = [
        "behavioral",
        "technical",
        "situational",
        "competency",
        "motivation",
        "unknown",
      ];
      this.currentQuestionType = validTypes.includes(result as QuestionType)
        ? (result as QuestionType)
        : "unknown";

      this.logger.info("Question classified", {
        question: question.substring(0, 50),
        type: this.currentQuestionType,
      });

      this.broadcast({ type: "question_type", data: this.currentQuestionType });
    } catch (error) {
      this.logger.error("Failed to classify question", error);
      this.currentQuestionType = "unknown";
    }
  }

  private async updateSTARProgress(response: string): Promise<void> {
    try {
      const prompt = `Analyze this interview response for STAR framework components.

Response: "${response}"

Current progress:
- Situation: ${this.starProgress.situation ? "DONE" : "NOT YET"}
- Task: ${this.starProgress.task ? "DONE" : "NOT YET"}
- Action: ${this.starProgress.action ? "DONE" : "NOT YET"}
- Result: ${this.starProgress.result ? "DONE" : "NOT YET"}

Which NEW components does this response contain? Only list components that are clearly present.
Respond in JSON format: {"situation": true/false, "task": true/false, "action": true/false, "result": true/false}
Only set true for components that are NEWLY covered in this response.`;

      const ai = this.env.AI as unknown as {
        run: (model: string, input: unknown) => Promise<unknown>;
      };

      const aiResponse = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
      });

      const result = (aiResponse as { response?: string }).response || "";

      // Parse JSON from response
      const jsonMatch = result.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Update progress (only add, never remove)
        if (parsed.situation) this.starProgress.situation = true;
        if (parsed.task) this.starProgress.task = true;
        if (parsed.action) this.starProgress.action = true;
        if (parsed.result) this.starProgress.result = true;

        this.logger.info("STAR progress updated", {
          progress: this.starProgress,
        });

        this.broadcast({ type: "star_progress", data: this.starProgress });
      }
    } catch (error) {
      this.logger.error(
        "Failed to update STAR progress",
        error as Record<string, unknown>,
      );
    }
  }

  private async generateInsight(userResponse: string): Promise<void> {
    try {
      // Get relevant resume context
      let resumeContext = "";
      try {
        const ragResult = await getInterviewContext(
          this.currentInterviewerQuestion || userResponse,
          this.config.roleplayId,
          this.env,
        );
        resumeContext = ragResult.combinedContext;
      } catch (e) {
        this.logger.warn(
          "Failed to get RAG context for insight",
          e as Record<string, unknown>,
        );
      }

      // Build insight generation prompt
      const starStatus =
        this.currentQuestionType === "behavioral"
          ? `STAR Progress: S:${this.starProgress.situation ? "✓" : "○"} T:${this.starProgress.task ? "✓" : "○"} A:${this.starProgress.action ? "✓" : "○"} R:${this.starProgress.result ? "✓" : "○"}`
          : "";

      const prompt = `You are a real-time interview coach. Generate ONE concise, actionable coaching tip.

Context:
- Question type: ${this.currentQuestionType}
- Interviewer asked: "${this.currentInterviewerQuestion}"
- Candidate responded: "${userResponse}"
${starStatus ? `- ${starStatus}` : ""}
${resumeContext ? `- Relevant from resume: ${resumeContext.substring(0, 300)}` : ""}

Rules:
1. Max 15 words
2. Be specific and actionable
3. If behavioral Q and STAR incomplete, guide to next component
4. Reference resume specifics if helpful
5. If response is strong, give brief positive reinforcement
6. If candidate seems stuck, offer a pivot suggestion

Respond with JSON:
{
  "type": "framework" | "resume_highlight" | "question_guidance" | "recovery" | "positive",
  "priority": "high" | "medium" | "low",
  "message": "Your 15-word max tip here"
}

If no insight is needed, respond: {"skip": true}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const aiResponse = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-8b-instruct",
        {
          messages: [{ role: "user", content: prompt }],
          max_tokens: 150,
        },
      );

      const result = (aiResponse as { response?: string }).response || "";

      // Parse JSON from response
      const jsonMatch = result.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.skip) {
          this.logger.info("Insight generation skipped - not needed");
          return;
        }

        const insight: Insight = {
          id: crypto.randomUUID(),
          roleplayId: this.config.roleplayId,
          timestamp: Date.now(),
          type: parsed.type as InsightType,
          priority: parsed.priority as InsightPriority,
          message: parsed.message,
          context: {
            questionType: this.currentQuestionType,
            frameworkProgress: { ...this.starProgress },
            interviewerQuestion: this.currentInterviewerQuestion,
            userResponse: userResponse.substring(0, 200),
          },
          shown: true,
        };

        this.insights.push(insight);
        this.lastInsightTime = Date.now();

        this.logger.info("Insight generated", {
          type: insight.type,
          priority: insight.priority,
          message: insight.message,
        });

        this.broadcast({ type: "insight", data: insight });
      }
    } catch (error) {
      this.logger.error("Failed to generate insight", error);
    }
  }

  getInsights(): Insight[] {
    return this.insights;
  }

  getTranscript(): TranscriptEntry[] {
    return this.transcript;
  }

  getState() {
    return {
      roleplayId: this.config.roleplayId,
      currentQuestionType: this.currentQuestionType,
      starProgress: this.starProgress,
      insights: this.insights,
      transcript: this.transcript,
      lastInsightTime: this.lastInsightTime,
    };
  }
}
