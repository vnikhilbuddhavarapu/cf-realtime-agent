import {
  DeepgramSTT,
  TextComponent,
  RealtimeKitTransport,
  ElevenLabsTTS,
  RealtimeAgent,
} from "@cloudflare/realtime-agents";
import type {
  Env,
  ScenarioConfig,
  PersonaConfig,
  InterviewReport,
} from "../types";
import { Logger } from "../utils/logger";
import { getInterviewContext } from "../rag";
import { InsightGenerator } from "../insights";
import { ReportGenerator } from "../report";

type MeetingSelfOn = (
  event: string,
  callback: (...args: unknown[]) => void,
) => void;
type MeetingSelfEnableAudio = () => Promise<void>;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  return value as Record<string, unknown>;
}

class InterviewTextProcessor extends TextComponent {
  private env: Env;
  private logger: Logger;
  private scenario: ScenarioConfig;
  private persona: PersonaConfig;
  private roleplayId: string;
  private interviewStartMs: number;
  private conversationHistory: { role: string; content: string }[] = [];
  private insightGenerator: InsightGenerator;
  private transcriptDebounceMs = 750;
  private shortTranscriptDebounceMs = 900;
  private minWordsForFastFinalize = 2;
  private pendingTranscriptSeq = 0;
  private pendingTranscriptText: string | null = null;
  private pendingReply: ((text: string) => void) | null = null;
  private pendingFinalizeTimeout: ReturnType<typeof setTimeout> | null = null;
  private turnIdSeq = 0;
  private activeTurnId: number | null = null;
  private generationInFlight = false;
  private queuedTurn: {
    turnId: number;
    text: string;
    reply: (text: string) => void;
  } | null = null;

  constructor(
    env: Env,
    scenario: ScenarioConfig,
    persona: PersonaConfig,
    roleplayId: string,
    interviewStartMs: number,
    insightGenerator: InsightGenerator,
  ) {
    super();
    this.env = env;
    this.logger = new Logger("InterviewTextProcessor");
    this.scenario = scenario;
    this.persona = persona;
    this.roleplayId = roleplayId;
    this.interviewStartMs = interviewStartMs;
    this.insightGenerator = insightGenerator;
  }

  public setInterviewStartMs(ms: number): void {
    this.interviewStartMs = ms;
  }

  private buildSystemPrompt(ragContext: string): string {
    const { persona, scenario } = this;

    const totalSeconds = Math.max(1, scenario.duration * 60);
    const elapsedSeconds = Math.max(
      0,
      Math.floor((Date.now() - this.interviewStartMs) / 1000),
    );
    const progress = Math.min(1, elapsedSeconds / totalSeconds);

    const phase =
      progress >= 0.95
        ? "wrap_up"
        : progress >= 0.85
          ? "candidate_questions"
          : "main_interview";

    const timeBudget =
      progress >= 0.95
        ? "ending"
        : progress >= 0.85
          ? "low"
          : progress >= 0.7
            ? "moderate"
            : "plenty";

    const phoneScreenStage = (() => {
      if (scenario.id !== "phone_screen") return phase;
      if (phase === "wrap_up") return "wrap_up";
      if (phase === "candidate_questions") return "candidate_questions";

      const candidateTurns = this.conversationHistory.filter(
        (h) => h.role === "candidate",
      ).length;

      if (candidateTurns === 0) return "greeting";
      if (elapsedSeconds < 60) return "small_talk";
      return "recruiter_questions";
    })();

    // Build demeanor guidelines
    const demeanorGuide = {
      warm: "Be friendly, encouraging, and supportive. Use positive language.",
      professional:
        "Maintain a formal, business-like tone. Be respectful and structured.",
      formal:
        "Be reserved and business-like. Keep responses measured and precise.",
      casual: "Be relaxed and conversational. Use natural, friendly language.",
      challenging:
        "Be direct and probing. Push for specifics and challenge vague answers.",
    }[persona.demeanor];

    // Build probing guidelines
    const probingGuide = {
      light: "Accept answers at face value. Ask minimal follow-up questions.",
      moderate: "Ask 1-2 follow-up questions to clarify or expand on answers.",
      deep: "Dig into details. Ask 'why' and 'how' repeatedly. Challenge vague responses.",
    }[persona.probingLevel];

    // Build feedback style
    const feedbackGuide = {
      encouraging:
        "Provide positive reinforcement. Say things like 'Great point!' or 'That's a good example.'",
      neutral:
        "Don't provide emotional feedback. Simply acknowledge and move on.",
      direct: "Be straightforward. If an answer is vague, say so directly.",
    }[persona.feedbackStyle];

    // Build difficulty guidelines
    const difficultyGuide = {
      easy: "Ask straightforward questions. Be forgiving of incomplete answers.",
      medium: "Ask standard interview questions. Expect reasonable detail.",
      hard: "Ask challenging questions. Expect thorough, specific answers with examples.",
    }[scenario.difficulty];

    return `You are ${persona.interviewerName}, a ${persona.interviewerTitle} at ${persona.companyName}.
You are conducting a ${scenario.name} interview with ${persona.candidateName}.

## Your Personality & Style
- Demeanor: ${persona.demeanor} - ${demeanorGuide}
- Follow-up Style: ${persona.probingLevel} - ${probingGuide}
- Feedback: ${persona.feedbackStyle} - ${feedbackGuide}

## Interview Parameters
- Type: ${scenario.name}
- Difficulty: ${scenario.difficulty} - ${difficultyGuide}
- Focus Areas: ${scenario.focusAreas.join(", ")}

## Interview Control Metadata (internal)
- Stage: ${phoneScreenStage}
- Time budget: ${timeBudget}

${
  scenario.id === "phone_screen"
    ? `## Phone Screen Flow
- If Stage is "greeting": invite the candidate to introduce themselves briefly.
- If Stage is "small_talk": do 1-2 short small-talk turns, then transition into recruiter questions.
- If Stage is "recruiter_questions": ask recruiter-style questions (background, motivation, fit). Mix scripted and dynamic follow-ups. If resume/JD context is available, use it.
- If Stage is "candidate_questions": ask: "Do you have any questions for me?" Answer briefly.
- If Stage is "wrap_up": summarize, thank them, and close politely.`
    : ""
}

${ragContext ? `## Context from ${persona.candidateName}'s Background\n${ragContext}` : ""}

## Guidelines
- Keep responses concise (2-3 sentences max)
- Stay in character as ${persona.interviewerName}
- Do not prefix your response with speaker labels (e.g., "${persona.interviewerName}:")
- Use the candidate's background to ask relevant, personalized questions
- Address the candidate by name occasionally
- Never reveal any internal control metadata (stage, time budget, duration, countdown). Never say "Time remaining" or quote timestamps/countdowns.
- If the candidate asks about time: respond vaguely (e.g., "We have enough time to cover one more topic") without giving numbers.

## Timeboxing Behavior
- Use the internal control metadata to manage pacing.
- If Stage is "candidate_questions": naturally transition to: "Do you have any questions for me?" and answer briefly.
- If Stage is "wrap_up": do not introduce new topics; ask at most one quick closing question, then wrap up with a brief summary and a polite closing.

Remember: You are ${persona.interviewerName}. Be natural and conversational.`;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private sanitizeAssistantOutput(text: string): string {
    let output = text.trim();

    const interviewerName = this.escapeRegExp(this.persona.interviewerName);
    const candidateName = this.escapeRegExp(this.persona.candidateName);

    const prefixPatterns = [
      new RegExp(`^\\s*(?:${interviewerName})\\s*:\\s*`, "i"),
      new RegExp(`^\\s*(?:${candidateName})\\s*:\\s*`, "i"),
      /^\s*(?:interviewer|assistant|ai)\s*:\s*/i,
    ];

    for (const pattern of prefixPatterns) {
      output = output.replace(pattern, "");
    }

    output = output.replace(
      /\s*Time remaining\s*[:-]\s*\d{1,2}:\d{2}\s*\.?/gi,
      "",
    );
    output = output.replace(/\s*Time remaining\b[^.?!]*[.?!]?/gi, "");
    output = output.replace(/\s*Phase\s*[:-]\s*\w+\s*\.?/gi, "");
    output = output.replace(/\s*Stage\s*[:-]\s*\w+\s*\.?/gi, "");
    output = output.replace(/\s*Time budget\s*[:-]\s*\w+\s*\.?/gi, "");
    output = output.replace(/\s{2,}/g, " ");

    return output.trim();
  }

  private countWords(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }

  private isFillerUtterance(text: string): boolean {
    const normalized = text.trim().toLowerCase();
    return (
      normalized === "um" ||
      normalized === "uh" ||
      normalized === "er" ||
      normalized === "ah" ||
      normalized === "hmm" ||
      normalized === "mm" ||
      normalized === "..."
    );
  }

  private queueFinalTranscript(
    text: string,
    reply: (text: string) => void,
    meta: { seq: number; debounceMs: number },
  ): void {
    this.turnIdSeq += 1;
    const turnId = this.turnIdSeq;

    this.queuedTurn = { turnId, text, reply };
    this.logger.info("Turn queued", {
      turnId,
      seq: meta.seq,
      debounceMs: meta.debounceMs,
      wordCount: this.countWords(text),
      textLength: text.length,
      scenarioId: this.scenario.id,
      roleplayId: this.roleplayId,
    });

    this.startTurnRunnerIfNeeded();
  }

  private startTurnRunnerIfNeeded(): void {
    if (this.generationInFlight) return;
    if (!this.queuedTurn) return;

    const turn = this.queuedTurn;
    this.queuedTurn = null;
    this.generationInFlight = true;
    this.activeTurnId = turn.turnId;

    this.logger.info("Turn start", {
      turnId: turn.turnId,
      wordCount: this.countWords(turn.text),
      scenarioId: this.scenario.id,
      roleplayId: this.roleplayId,
    });

    this.processFinalTranscript(turn.turnId, turn.text, turn.reply)
      .catch((err) => {
        this.logger.error("Turn failed", err);
        turn.reply(
          "I apologize, I encountered an error. Could you please repeat that?",
        );
      })
      .finally(() => {
        if (this.activeTurnId === turn.turnId) {
          this.activeTurnId = null;
        }
        this.generationInFlight = false;

        this.logger.info("Turn complete", {
          turnId: turn.turnId,
          scenarioId: this.scenario.id,
          roleplayId: this.roleplayId,
        });

        this.startTurnRunnerIfNeeded();
      });
  }

  private async processFinalTranscript(
    turnId: number,
    text: string,
    reply: (text: string) => void,
  ): Promise<void> {
    this.logger.info("Finalized transcript", {
      turnId,
      text,
      textLength: text.length,
      wordCount: this.countWords(text),
      scenarioId: this.scenario.id,
      roleplayId: this.roleplayId,
    });

    try {
      this.insightGenerator.processUserUtterance(text).catch((err) => {
        this.logger.warn("InsightGenerator failed to process user utterance", {
          error: String(err),
        });
      });
      let ragContext: {
        resumeContext: unknown[];
        jdContext: unknown[];
        combinedContext: string;
      } = { resumeContext: [], jdContext: [], combinedContext: "" };
      try {
        ragContext = await getInterviewContext(text, this.roleplayId, this.env);
        this.logger.info("RAG context retrieved", {
          resumeMatches: ragContext.resumeContext.length,
          jdMatches: ragContext.jdContext.length,
        });
      } catch (ragError) {
        this.logger.warn(
          "RAG context retrieval failed, continuing without context",
          {
            error: String(ragError),
          },
        );
      }

      const systemPrompt = this.buildSystemPrompt(ragContext.combinedContext);
      this.logger.info("System prompt built", {
        promptLength: systemPrompt.length,
      });

      this.conversationHistory.push({ role: "candidate", content: text });

      const recentHistory = this.conversationHistory.slice(-6);
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...recentHistory.map((h) => ({
          role: (h.role === "candidate" ? "user" : "assistant") as
            | "user"
            | "assistant",
          content: h.content,
        })),
      ];

      this.logger.info("Calling Workers AI for response", {
        turnId,
        historyLength: recentHistory.length,
        promptPreview: systemPrompt.substring(0, 100),
      });

      let result;
      try {
        // @ts-expect-error - Workers AI model name type is overly restrictive
        result = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages,
          max_tokens: 150,
        });
        this.logger.info("Workers AI response received", {
          turnId,
          resultType: typeof result,
          hasResponse: !!(result as { response?: string })?.response,
        });
      } catch (aiError) {
        this.logger.error("Workers AI call failed", aiError);
        throw aiError;
      }

      const responseText =
        typeof result === "string"
          ? result
          : (result as { response?: string }).response || String(result);

      const sanitizedResponseText = this.sanitizeAssistantOutput(responseText);

      if (sanitizedResponseText !== responseText.trim()) {
        this.logger.info("Sanitized assistant output", {
          turnId,
          originalPreview: responseText.trim().substring(0, 80),
          sanitizedPreview: sanitizedResponseText.substring(0, 80),
          scenarioId: this.scenario.id,
          roleplayId: this.roleplayId,
        });
      }

      if (this.activeTurnId !== turnId) {
        this.logger.warn("Stale LLM result discarded", {
          turnId,
          activeTurnId: this.activeTurnId,
          scenarioId: this.scenario.id,
          roleplayId: this.roleplayId,
        });
        return;
      }

      this.conversationHistory.push({
        role: "interviewer",
        content: sanitizedResponseText,
      });

      this.insightGenerator
        .processInterviewerUtterance(sanitizedResponseText)
        .catch((err) => {
          this.logger.warn(
            "InsightGenerator failed to process interviewer utterance",
            {
              error: String(err),
            },
          );
        });

      this.logger.info("Generated AI response with full persona config", {
        response: sanitizedResponseText.substring(0, 100),
        historyLength: this.conversationHistory.length,
        interviewer: this.persona.interviewerName,
      });

      this.logger.info("Calling reply() with response");
      reply(sanitizedResponseText);
      this.logger.info("reply() called successfully");
    } catch (error) {
      this.logger.error("Error generating response", error);

      if (this.activeTurnId !== turnId) {
        this.logger.warn("Skipping error reply for stale turn", {
          turnId,
          activeTurnId: this.activeTurnId,
          scenarioId: this.scenario.id,
          roleplayId: this.roleplayId,
        });
        return;
      }

      reply(
        "I apologize, I encountered an error. Could you please repeat that?",
      );
    }
  }

  async onTranscript(
    text: string,
    reply: (text: string) => void,
  ): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (this.isFillerUtterance(trimmed)) {
      this.logger.info("Ignoring filler transcript", {
        text: trimmed,
        scenarioId: this.scenario.id,
        roleplayId: this.roleplayId,
      });
      return;
    }

    const wordCount = this.countWords(trimmed);
    const debounceMs =
      wordCount < this.minWordsForFastFinalize
        ? this.shortTranscriptDebounceMs
        : this.transcriptDebounceMs;
    this.pendingTranscriptSeq += 1;
    const seq = this.pendingTranscriptSeq;
    this.pendingTranscriptText = trimmed;
    this.pendingReply = reply;

    if (this.pendingFinalizeTimeout) {
      clearTimeout(this.pendingFinalizeTimeout);
      this.pendingFinalizeTimeout = null;
    }

    this.logger.info("Buffered transcript update", {
      seq,
      wordCount,
      debounceMs,
      textLength: trimmed.length,
      textPreview: trimmed.substring(0, 60),
      scenarioId: this.scenario.id,
      roleplayId: this.roleplayId,
    });

    this.pendingFinalizeTimeout = setTimeout(() => {
      if (seq !== this.pendingTranscriptSeq) return;
      const finalText = this.pendingTranscriptText;
      const finalReply = this.pendingReply;

      this.pendingTranscriptText = null;
      this.pendingReply = null;
      this.pendingFinalizeTimeout = null;

      if (!finalText || !finalReply) return;

      this.logger.info("Transcript debounce window elapsed", {
        seq,
        debounceMs,
        wordCount: this.countWords(finalText),
        scenarioId: this.scenario.id,
        roleplayId: this.roleplayId,
      });

      this.queueFinalTranscript(finalText, finalReply, { seq, debounceMs });
    }, debounceMs);
  }
}

export class InterviewAgent extends RealtimeAgent<Env> {
  private logger: Logger;
  private insightGenerator?: InsightGenerator;
  private scenario?: ScenarioConfig;
  private persona?: PersonaConfig;
  private roleplayId?: string;
  private startTime?: number;
  private interviewStartLocked = false;
  private initInProgress = false;
  private meetingJoined = false;
  private agentReady = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.logger = new Logger("InterviewAgent");
  }

  private async waitForPipelineReady(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.pipeline) return true;
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    return !!this.pipeline;
  }

  // Override fetch to handle insights WebSocket before passing to parent
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ready") {
      return new Response(
        JSON.stringify({
          ready: this.agentReady,
          initInProgress: this.initInProgress,
          hasPipeline: !!this.pipeline,
          meetingJoined: this.meetingJoined,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (url.pathname.startsWith("/agentsInternal")) {
      const retryRequest1 = request.clone();
      const retryRequest2 = request.clone();

      if (!this.pipeline) {
        if (this.initInProgress) {
          this.logger.info(
            "agentsInternal request received while init in progress",
            {
              path: url.pathname,
            },
          );
          await this.waitForPipelineReady(10000);
        }
      }

      // Retry once if the underlying handler still throws during init races.
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const attemptRequest =
            attempt === 1
              ? request
              : attempt === 2
                ? retryRequest1
                : retryRequest2;

          const response = await super.fetch(attemptRequest);

          const isWebSocketHandshake =
            response.status === 101 ||
            request.headers.get("Upgrade")?.toLowerCase() === "websocket";

          if (attempt > 1) {
            this.logger.info("agentsInternal request succeeded after retry", {
              path: url.pathname,
              method: request.method,
              attempt,
              status: response.status,
            });
          }

          if (!response.ok && !isWebSocketHandshake) {
            let bodyPreview: string | undefined;
            try {
              bodyPreview = (await response.clone().text()).slice(0, 200);
            } catch (e) {
              bodyPreview = `<<failed to read body: ${String(e)}>>`;
            }

            this.logger.warn("agentsInternal request returned non-OK", {
              path: url.pathname,
              method: request.method,
              status: response.status,
              bodyPreview,
            });
          }

          return response;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const isNotInitialized = message
            .toLowerCase()
            .includes("meeting not initialized");

          if (isNotInitialized && attempt < 3) {
            this.logger.warn(
              "agentsInternal request failed before init completed; retrying",
              {
                path: url.pathname,
                error: message,
              },
            );
            await this.waitForPipelineReady(20000);
            continue;
          }

          if (isNotInitialized) {
            this.logger.warn(
              "agentsInternal request rejected; meeting not initialized",
              {
                path: url.pathname,
                initInProgress: this.initInProgress,
                hasPipeline: !!this.pipeline,
                meetingJoined: this.meetingJoined,
                agentReady: this.agentReady,
              },
            );
            return new Response("meeting not initialized", { status: 503 });
          }

          throw err;
        }
      }
    }

    // Handle insights WebSocket upgrade
    if (
      url.pathname === "/insights/ws" &&
      request.headers.get("Upgrade") === "websocket"
    ) {
      this.logger.info("Handling insights WebSocket upgrade");

      // Create WebSocket pair
      const { 0: client, 1: server } = new WebSocketPair();

      // Accept the server side
      server.accept();

      // Add to insight generator if available
      if (this.insightGenerator) {
        this.insightGenerator.addWebSocket(server);
        server.addEventListener("close", () => {
          this.insightGenerator?.removeWebSocket(server);
        });
        this.logger.info("Insights WebSocket connected to InsightGenerator");
      } else {
        this.logger.warn(
          "InsightGenerator not initialized, WebSocket will receive no data",
        );
        // Don't close - the generator might be initialized later
      }

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    // Pass all other requests to parent (RealtimeAgent)
    return super.fetch(request);
  }

  getInsightGenerator(): InsightGenerator | undefined {
    return this.insightGenerator;
  }

  async init(
    agentId: string,
    meetingId: string,
    authToken: string,
    workerUrl: string, // Just hostname, no protocol (e.g., "example.workers.dev")
    accountId: string,
    apiToken: string,
    scenario: ScenarioConfig,
    persona: PersonaConfig,
    roleplayId: string, // Added for RAG context
  ): Promise<void> {
    this.logger.info("Initializing InterviewAgent", {
      agentId,
      meetingId,
      workerUrl,
      scenarioId: scenario.id,
      interviewerName: persona.interviewerName,
      roleplayId,
    });

    this.initInProgress = true;
    this.meetingJoined = false;
    this.agentReady = false;

    try {
      this.logger.info("🚀 STARTING AGENT INIT - NEW CODE", {
        agentId,
        meetingId,
        scenarioName: scenario.name,
        interviewerName: persona.interviewerName,
        roleplayId,
      });

      // Store for report generation
      this.scenario = scenario;
      this.persona = persona;
      this.roleplayId = roleplayId;
      this.startTime = Date.now();

      // Create InsightGenerator for real-time coaching
      this.insightGenerator = new InsightGenerator(this.env, {
        roleplayId,
        persona,
        scenario,
      });
      this.logger.info("InsightGenerator created", { roleplayId });

      const textProcessor = new InterviewTextProcessor(
        this.env,
        scenario,
        persona,
        roleplayId,
        this.startTime,
        this.insightGenerator,
      );
      // Use default filters as per docs - don't restrict media kinds
      const rtkTransport = new RealtimeKitTransport(meetingId, authToken);

      // Verify API keys are present
      this.logger.info("Checking API keys", {
        hasDeepgramKey: !!this.env.DEEPGRAM_API_KEY,
        hasElevenLabsKey: !!this.env.ELEVENLABS_API_KEY,
        deepgramKeyLength: this.env.DEEPGRAM_API_KEY?.length || 0,
        elevenLabsKeyLength: this.env.ELEVENLABS_API_KEY?.length || 0,
      });

      const voiceId =
        persona.voiceId === "voice_michael"
          ? this.env.ELEVENLABS_VOICE_MALE
          : this.env.ELEVENLABS_VOICE_FEMALE;

      const ttsConfig: {
        model?: string;
        voice_id?: string;
      } = {};
      if (typeof this.env.ELEVENLABS_MODEL === "string") {
        ttsConfig.model = this.env.ELEVENLABS_MODEL;
      }
      if (typeof voiceId === "string") {
        ttsConfig.voice_id = voiceId;
      }

      const tts = new ElevenLabsTTS(
        this.env.ELEVENLABS_API_KEY,
        Object.keys(ttsConfig).length ? ttsConfig : undefined,
      );
      this.logger.info("ElevenLabs TTS instance created");

      this.logger.info("Calling initPipeline with components", {
        components: [
          "RealtimeKitTransport",
          "DeepgramSTT",
          "InterviewTextProcessor",
          "ElevenLabsTTS",
          "RealtimeKitTransport",
        ],
        agentId,
        workerUrl,
        accountId,
        hasApiToken: !!apiToken,
      });

      await this.initPipeline(
        [
          rtkTransport,
          new DeepgramSTT(this.env.DEEPGRAM_API_KEY),
          textProcessor,
          tts,
          rtkTransport,
        ],
        agentId,
        workerUrl,
        accountId,
        apiToken,
      );

      this.logger.info(
        "Pipeline initialized successfully - checking pipeline state",
      );

      // Log pipeline details
      if (this.pipeline) {
        this.logger.info("Pipeline details", {
          flowId: this.pipeline.flowId,
          hasAuthToken: !!this.pipeline.authToken,
          componentCount: this.pipeline.components?.length,
        });
      }
      const { meeting } = rtkTransport;
      this.logger.info("Got meeting object from transport");

      try {
        const meetingRecord = asRecord(meeting);
        const selfRecord = meetingRecord
          ? asRecord(meetingRecord["self"])
          : undefined;
        const onFn = selfRecord?.["on"];

        if (typeof onFn === "function") {
          (onFn as MeetingSelfOn)("audioUpdate", (evt: unknown) => {
            const audioEnabledRaw = selfRecord?.["audioEnabled"];
            const audioEnabled =
              typeof audioEnabledRaw === "boolean"
                ? audioEnabledRaw
                : undefined;

            this.logger.info("Agent audioUpdate event", {
              audioEnabled,
              eventType: typeof evt,
            });
          });
        } else {
          this.logger.warn(
            "meeting.self.on is not available; cannot observe audioUpdate",
          );
        }
      } catch (e) {
        this.logger.warn("Failed to attach agent audioUpdate listener", {
          error: String(e),
        });
      }

      // Wait for TextProcessor WebSocket to be ready
      // The pipeline.init() creates the WS but doesn't wait for it to open
      const textProcessorWs = (textProcessor as unknown as { ws?: WebSocket })
        .ws;
      if (textProcessorWs) {
        this.logger.info("Waiting for TextProcessor WebSocket to open", {
          readyState: textProcessorWs.readyState,
        });
        if (textProcessorWs.readyState !== WebSocket.OPEN) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("TextProcessor WebSocket connection timeout"));
            }, 10000);
            textProcessorWs.addEventListener("open", () => {
              clearTimeout(timeout);
              this.logger.info("TextProcessor WebSocket opened");
              resolve();
            });
            textProcessorWs.addEventListener("error", (e) => {
              clearTimeout(timeout);
              this.logger.error("TextProcessor WebSocket error", e);
              reject(new Error("TextProcessor WebSocket error"));
            });
            // If already open, resolve immediately
            if (textProcessorWs.readyState === WebSocket.OPEN) {
              clearTimeout(timeout);
              resolve();
            }
          });
        }
        this.logger.info("TextProcessor WebSocket ready", {
          readyState: textProcessorWs.readyState,
        });
      } else {
        this.logger.warn("TextProcessor WebSocket not found!");
      }

      // Register event handlers BEFORE joining (exactly as per docs)
      meeting.participants.joined.on("participantJoined", (participant) => {
        this.logger.info("Participant joined", { name: participant.name });

        if (!this.interviewStartLocked) {
          this.interviewStartLocked = true;
          const interviewStartMs = Date.now();
          this.startTime = interviewStartMs;
          textProcessor.setInterviewStartMs(interviewStartMs);
          this.logger.info("Interview start time locked", {
            interviewStartMs,
          });
        }

        // Add a small delay to ensure pipeline is fully ready for audio production
        setTimeout(() => {
          const greeting = `Hello ${persona.candidateName}! I'm ${persona.interviewerName}, ${persona.interviewerTitle} at ${persona.companyName}. Thanks for joining this ${scenario.name}. Let's begin when you're ready.`;
          this.logger.info("Speaking greeting after delay");
          textProcessor.speak(greeting);

          // Add greeting to transcript so it appears in the report
          this.insightGenerator
            ?.processInterviewerUtterance(greeting)
            .catch((err) => {
              this.logger.warn("Failed to add greeting to transcript", {
                error: String(err),
              });
            });
        }, 2000); // 2 second delay to ensure pipeline is ready
      });

      meeting.participants.joined.on("participantLeft", (participant) => {
        this.logger.info("Participant left", { name: participant.name });
      });

      // Make sure to actually join the meeting after registering all handlers
      let joinError: unknown;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          await meeting.join();
          joinError = undefined;
          break;
        } catch (err) {
          joinError = err;
          this.logger.warn("Agent failed to join meeting; retrying", {
            attempt,
            meetingId,
            error: err instanceof Error ? err.message : String(err),
          });

          // Exponential-ish backoff: 500ms, 1000ms, 2000ms
          const backoffMs = 500 * Math.pow(2, attempt - 1);
          await new Promise<void>((resolve) => setTimeout(resolve, backoffMs));
        }
      }

      if (joinError) {
        throw joinError;
      }
      this.logger.info("Agent joined meeting successfully");

      try {
        const meetingRecord = asRecord(meeting);
        const selfRecord = meetingRecord
          ? asRecord(meetingRecord["self"])
          : undefined;
        const audioEnabledBeforeRaw = selfRecord?.["audioEnabled"];
        const audioEnabledBefore =
          typeof audioEnabledBeforeRaw === "boolean"
            ? audioEnabledBeforeRaw
            : undefined;
        this.logger.info("Ensuring agent audio is enabled", {
          audioEnabledBefore,
        });

        const setAudioEnabledFn = selfRecord?.["setAudioEnabled"];
        if (typeof setAudioEnabledFn === "function") {
          try {
            const maybePromise = (
              setAudioEnabledFn as (enabled: boolean) => unknown
            )(true);
            if (maybePromise instanceof Promise) {
              await maybePromise;
            }
            this.logger.info("Called meeting.self.setAudioEnabled(true)");
          } catch (e) {
            this.logger.warn("meeting.self.setAudioEnabled(true) failed", {
              error: String(e),
            });
          }
        } else {
          this.logger.warn("meeting.self.setAudioEnabled is not available");
        }

        const enableAudioFn = selfRecord?.["enableAudio"];
        if (typeof enableAudioFn === "function") {
          try {
            await (enableAudioFn as MeetingSelfEnableAudio)();
            this.logger.info("Called meeting.self.enableAudio()");
          } catch (e) {
            this.logger.warn("meeting.self.enableAudio() failed", {
              error: String(e),
            });
          }
        }

        const audioEnabledAfterRaw = selfRecord?.["audioEnabled"];
        const audioEnabledAfter =
          typeof audioEnabledAfterRaw === "boolean"
            ? audioEnabledAfterRaw
            : undefined;
        this.logger.info("Agent audio enabled", {
          audioEnabledAfter,
        });
      } catch (e) {
        this.logger.warn("Failed to enable agent audio", {
          error: String(e),
        });
      }

      this.meetingJoined = true;
      this.agentReady = true;
    } catch (error) {
      this.logger.error("Failed to initialize agent", error);
      throw error;
    } finally {
      this.initInProgress = false;
    }
  }

  async deinit(): Promise<void> {
    this.logger.info("Deinitializing InterviewAgent");
    try {
      await this.deinitPipeline();
      this.agentReady = false;
      this.meetingJoined = false;
      this.logger.info("Agent successfully deinitialized");
    } catch (error) {
      this.logger.error("Failed to deinitialize agent", error);
      throw error;
    }
  }

  async generateReport(): Promise<InterviewReport> {
    this.logger.info("Generating interview report", {
      roleplayId: this.roleplayId,
    });

    if (
      !this.scenario ||
      !this.persona ||
      !this.roleplayId ||
      !this.startTime
    ) {
      throw new Error(
        "Interview not properly initialized - cannot generate report",
      );
    }

    const transcript = this.insightGenerator?.getTranscript() || [];

    const reportGenerator = new ReportGenerator(this.env, {
      roleplayId: this.roleplayId,
      scenario: this.scenario,
      persona: this.persona,
      transcript,
      startTime: this.startTime,
      endTime: Date.now(),
    });

    const report = await reportGenerator.generateReport();

    this.logger.info("Report generated", {
      roleplayId: this.roleplayId,
      overallScore: report.overallScore,
      transcriptLength: transcript.length,
    });

    return report;
  }
}
