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

class InterviewTextProcessor extends TextComponent {
  private env: Env;
  private logger: Logger;
  private scenario: ScenarioConfig;
  private persona: PersonaConfig;
  private roleplayId: string;
  private conversationHistory: { role: string; content: string }[] = [];
  private insightGenerator: InsightGenerator;

  constructor(
    env: Env,
    scenario: ScenarioConfig,
    persona: PersonaConfig,
    roleplayId: string,
    insightGenerator: InsightGenerator,
  ) {
    super();
    this.env = env;
    this.logger = new Logger("InterviewTextProcessor");
    this.scenario = scenario;
    this.persona = persona;
    this.roleplayId = roleplayId;
    this.insightGenerator = insightGenerator;
  }

  private buildSystemPrompt(ragContext: string): string {
    const { persona, scenario } = this;

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
- Duration: ${scenario.duration} minutes

${ragContext ? `## Context from ${persona.candidateName}'s Background\n${ragContext}` : ""}

## Guidelines
- Keep responses concise (2-3 sentences max)
- Stay in character as ${persona.interviewerName}
- Use the candidate's background to ask relevant, personalized questions
- Address the candidate by name occasionally

Remember: You are ${persona.interviewerName}. Be natural and conversational.`;
  }

  async onTranscript(
    text: string,
    reply: (text: string) => void,
  ): Promise<void> {
    this.logger.info("Received transcript", {
      text,
      scenarioId: this.scenario.id,
      roleplayId: this.roleplayId,
    });

    try {
      // Send user transcript to InsightGenerator for analysis (non-blocking)
      this.insightGenerator.processUserUtterance(text).catch((err) => {
        this.logger.warn("InsightGenerator failed to process user utterance", {
          error: String(err),
        });
      });
      // Get RAG context for this question/response (optional - don't block on errors)
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

      // Build context-aware system prompt with full persona/scenario config
      const systemPrompt = this.buildSystemPrompt(ragContext.combinedContext);
      this.logger.info("System prompt built", {
        promptLength: systemPrompt.length,
      });

      // Add to conversation history
      this.conversationHistory.push({ role: "candidate", content: text });

      // Build conversation context (last 6 exchanges)
      const recentHistory = this.conversationHistory.slice(-6);
      const historyText = recentHistory
        .map(
          (h) =>
            `${h.role === "candidate" ? this.persona.candidateName : this.persona.interviewerName}: ${h.content}`,
        )
        .join("\n");

      this.logger.info("Calling Workers AI for response", {
        historyLength: recentHistory.length,
        promptPreview: systemPrompt.substring(0, 100),
      });

      // Use messages format for better compatibility with Llama models
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: historyText || text },
      ];

      let result;
      try {
        // @ts-expect-error - Workers AI model name type is overly restrictive
        result = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
          messages,
          max_tokens: 150,
        });
        this.logger.info("Workers AI response received", {
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

      // Add response to history
      this.conversationHistory.push({
        role: "interviewer",
        content: responseText,
      });

      // Send interviewer response to InsightGenerator (non-blocking)
      this.insightGenerator
        .processInterviewerUtterance(responseText)
        .catch((err) => {
          this.logger.warn(
            "InsightGenerator failed to process interviewer utterance",
            {
              error: String(err),
            },
          );
        });

      this.logger.info("Generated AI response with full persona config", {
        response: responseText.substring(0, 100),
        historyLength: this.conversationHistory.length,
        interviewer: this.persona.interviewerName,
      });

      this.logger.info("Calling reply() with response");
      reply(responseText);
      this.logger.info("reply() called successfully");
    } catch (error) {
      this.logger.error("Error generating response", error);
      reply(
        "I apologize, I encountered an error. Could you please repeat that?",
      );
    }
  }
}

export class InterviewAgent extends RealtimeAgent<Env> {
  private logger: Logger;
  private insightGenerator?: InsightGenerator;
  private scenario?: ScenarioConfig;
  private persona?: PersonaConfig;
  private roleplayId?: string;
  private startTime?: number;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.logger = new Logger("InterviewAgent");
  }

  // Override fetch to handle insights WebSocket before passing to parent
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

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

      const tts = new ElevenLabsTTS(this.env.ELEVENLABS_API_KEY);
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
      await meeting.join();
      this.logger.info("Agent joined meeting successfully");
    } catch (error) {
      this.logger.error("Failed to initialize agent", error);
      throw error;
    }
  }

  async deinit(): Promise<void> {
    this.logger.info("Deinitializing InterviewAgent");
    try {
      await this.deinitPipeline();
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
