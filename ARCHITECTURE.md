# AI Interview Coach - Architecture Deep Dive

## UX Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LANDING          2. SCENARIO         3. CUSTOMIZATION      4. UPLOAD    │
│  ┌─────────┐         ┌─────────┐         ┌─────────────┐       ┌─────────┐  │
│  │  Start  │ ──────► │  Pick   │ ──────► │  Customize  │ ────► │  JD +   │  │
│  │  Here   │         │ Scenario│         │  Persona    │       │ Resume  │  │
│  └─────────┘         └─────────┘         └─────────────┘       └─────────┘  │
│                                                                      │       │
│                                                                      ▼       │
│  7. NEW SESSION      6. REPORT           5. MEETING + INSIGHTS              │
│  ┌─────────┐         ┌─────────┐         ┌─────────────────────┐            │
│  │ Repeat  │ ◄────── │  Final  │ ◄────── │  Real-time Voice    │            │
│  │         │         │ Report  │         │  + Coaching HUD     │            │
│  └─────────┘         └─────────┘         └─────────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model & ID Relationships

### Hierarchy
```
Session (sessionId)
    └── Roleplay (roleplayId)  ← All customization stored here
            └── Meeting (meetingId)  ← RealtimeKit meeting
                    └── Transcript entries
                    └── Insights generated
                    └── Final report
```

### Why This Structure?
- **Session**: User's browser session, can have multiple roleplays
- **Roleplay**: One complete interview configuration (scenario + persona + JD + resume)
- **Meeting**: The actual RealtimeKit meeting instance (can be restarted)

### RAG Scoping
All vector embeddings are scoped to `roleplayId`:
```
metadata: {
  roleplayId: "abc-123",
  source: "resume" | "job_description" | "knowledge_base",
  chunkType: "experience" | "skill" | "requirement" | "technique"
}
```

---

## Scenario & Customization Schema

### Scenarios (Presets)
```typescript
interface Scenario {
  id: string;
  name: string;
  description: string;
  defaultPersona: PersonaPreset;
  questionBank: QuestionTemplate[];  // Deterministic questions
  techniques: string[];  // e.g., ["STAR", "CAR", "SOAR"]
  duration: number;  // minutes
  difficulty: "easy" | "medium" | "hard";
}

const SCENARIOS = {
  phone_screen: {
    name: "Phone Screen",
    description: "Initial recruiter call - culture fit, basic qualifications",
    defaultPersona: { demeanor: "friendly", probing: "light" },
    techniques: ["elevator_pitch", "motivation"],
    questionBank: [
      "Tell me about yourself",
      "Why are you interested in this role?",
      "What are your salary expectations?",
    ]
  },
  behavioral: {
    name: "Behavioral Interview",
    description: "Deep dive into past experiences using STAR method",
    defaultPersona: { demeanor: "professional", probing: "deep" },
    techniques: ["STAR", "CAR"],
    questionBank: [
      "Tell me about a time you faced a conflict at work",
      "Describe a situation where you had to lead a team",
      "Give an example of when you failed and what you learned",
    ]
  },
  technical: {
    name: "Technical Round",
    description: "System design, coding concepts, technical depth",
    defaultPersona: { demeanor: "analytical", probing: "deep" },
    techniques: ["problem_solving", "trade_offs"],
    questionBank: [
      "Walk me through a system you designed",
      "How would you scale this to 10x users?",
      "What's your debugging process?",
    ]
  },
  // ... more scenarios
};
```

### Persona Customization
```typescript
interface PersonaConfig {
  // Interviewer Identity
  interviewerName: string;
  interviewerRole: string;  // "Senior Recruiter", "Engineering Manager"
  companyName: string;
  
  // User Identity
  userName: string;
  targetRole: string;  // Role they're applying for
  
  // Behavior Tuning
  demeanor: "friendly" | "professional" | "challenging" | "analytical";
  probingLevel: "light" | "moderate" | "deep" | "aggressive";
  feedbackStyle: "encouraging" | "neutral" | "critical";
  
  // Interview Style
  interruptionFrequency: "never" | "rare" | "sometimes" | "often";
  followUpDepth: 1 | 2 | 3;  // How many follow-ups per topic
  
  // Voice (ElevenLabs)
  voiceId: string;
  speakingPace: "slow" | "normal" | "fast";
}
```

### Complete Roleplay Data
```typescript
interface RoleplayData {
  roleplayId: string;
  sessionId: string;
  
  // Scenario
  scenarioId: string;
  scenario: Scenario;
  
  // Persona
  persona: PersonaConfig;
  
  // Documents (raw + processed)
  jobDescription: {
    raw: string;
    parsed: ParsedJobDescription;
    embeddingIds: string[];  // Vectorize IDs
  };
  resume: {
    raw: string;
    parsed: ParsedResume;
    embeddingIds: string[];
  };
  
  // Meeting State
  meetingId?: string;
  status: "setup" | "ready" | "active" | "completed";
  
  // Results
  transcript: TranscriptEntry[];
  insights: InsightEntry[];
  report?: FinalReport;
  
  createdAt: number;
  completedAt?: number;
}
```

---

## RAG Pipeline Architecture

### Document Processing Flow
```
┌──────────────────────────────────────────────────────────────────────────┐
│                         DOCUMENT INGESTION                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Job Description                          Resume                          │
│  ┌─────────────┐                         ┌─────────────┐                 │
│  │   Raw Text  │                         │   Raw Text  │                 │
│  └──────┬──────┘                         └──────┬──────┘                 │
│         │                                       │                         │
│         ▼                                       ▼                         │
│  ┌─────────────┐                         ┌─────────────┐                 │
│  │   Parser    │                         │   Parser    │                 │
│  │  (Workers   │                         │  (Workers   │                 │
│  │    AI)      │                         │    AI)      │                 │
│  └──────┬──────┘                         └──────┬──────┘                 │
│         │                                       │                         │
│         ▼                                       ▼                         │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                    STRUCTURED EXTRACTION                         │     │
│  ├─────────────────────────────────────────────────────────────────┤     │
│  │  JD:                              Resume:                        │     │
│  │  - Company info                   - Contact info                 │     │
│  │  - Role title                     - Work experiences[]           │     │
│  │  - Requirements[]                 - Education[]                  │     │
│  │  - Responsibilities[]             - Skills[]                     │     │
│  │  - Nice-to-haves[]                - Projects[]                   │     │
│  │  - Culture signals                - Achievements[]               │     │
│  └──────────────────────────┬──────────────────────────────────────┘     │
│                             │                                             │
│                             ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                      CHUNKING STRATEGY                           │     │
│  ├─────────────────────────────────────────────────────────────────┤     │
│  │  Semantic chunks with rich metadata:                             │     │
│  │                                                                  │     │
│  │  {                                                               │     │
│  │    text: "Led team of 5 engineers to build...",                 │     │
│  │    metadata: {                                                   │     │
│  │      roleplayId: "abc-123",                                     │     │
│  │      source: "resume",                                          │     │
│  │      chunkType: "experience",                                   │     │
│  │      company: "AWS",                                            │     │
│  │      role: "Software Engineer",                                 │     │
│  │      skills: ["leadership", "engineering"],                     │     │
│  │      timeframe: "2020-2023"                                     │     │
│  │    }                                                             │     │
│  │  }                                                               │     │
│  └──────────────────────────┬──────────────────────────────────────┘     │
│                             │                                             │
│                             ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                    VECTORIZE (Cloudflare)                        │     │
│  │                                                                  │     │
│  │  Index: interview-context                                        │     │
│  │  Namespace: {roleplayId}                                        │     │
│  │  Embedding Model: @cf/baai/bge-base-en-v1.5                     │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Parsed Document Schemas

```typescript
interface ParsedJobDescription {
  company: {
    name: string;
    industry?: string;
    size?: string;
    culture?: string[];
  };
  role: {
    title: string;
    level: string;  // "junior", "mid", "senior", "staff"
    team?: string;
    reportsTo?: string;
  };
  requirements: {
    mustHave: string[];
    niceToHave: string[];
    yearsExperience?: number;
  };
  responsibilities: string[];
  techStack?: string[];
  benefits?: string[];
  redFlags?: string[];  // Things to probe on
}

interface ParsedResume {
  contact: {
    name: string;
    email?: string;
    location?: string;
  };
  summary?: string;
  experiences: {
    company: string;
    role: string;
    duration: string;
    startDate?: string;
    endDate?: string;
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
  projects?: {
    name: string;
    description: string;
    technologies: string[];
  }[];
  achievements?: string[];
  gaps?: string[];  // Employment gaps to potentially address
  strengthAreas?: string[];  // AI-identified strengths
  weakAreas?: string[];  // Areas that might need coaching
}
```

---

## Knowledge Base: Interview Techniques

### Structure
```typescript
interface InterviewTechnique {
  id: string;
  name: string;
  acronym?: string;
  description: string;
  whenToUse: string[];
  structure: {
    step: string;
    description: string;
    example: string;
    coachingPrompt: string;  // What to show in Insights HUD
  }[];
  goodExample: string;
  badExample: string;
  applicableScenarios: string[];
}

const TECHNIQUES: InterviewTechnique[] = [
  {
    id: "star",
    name: "STAR Method",
    acronym: "STAR",
    description: "Structured approach for behavioral questions",
    whenToUse: [
      "Tell me about a time...",
      "Describe a situation where...",
      "Give an example of...",
    ],
    structure: [
      {
        step: "Situation",
        description: "Set the context",
        example: "In my role as Tech Lead at AWS...",
        coachingPrompt: "📍 Set the scene - where, when, what was the context?"
      },
      {
        step: "Task",
        description: "Explain your responsibility",
        example: "I was responsible for reducing latency by 50%...",
        coachingPrompt: "🎯 What was YOUR specific responsibility?"
      },
      {
        step: "Action",
        description: "Detail what YOU did",
        example: "I implemented a caching layer and optimized queries...",
        coachingPrompt: "⚡ What specific actions did YOU take? Use 'I' not 'we'"
      },
      {
        step: "Result",
        description: "Quantify the outcome",
        example: "This reduced latency by 60% and saved $2M annually",
        coachingPrompt: "📊 Quantify the impact - numbers, percentages, outcomes"
      }
    ],
    goodExample: "At AWS (S), I was tasked with improving API response times (T). I profiled the system, identified N+1 queries, and implemented batch loading (A). This reduced p99 latency from 2s to 200ms, improving customer satisfaction by 40% (R).",
    badExample: "We had slow APIs so the team fixed them and things got better.",
    applicableScenarios: ["behavioral", "technical", "leadership"]
  },
  {
    id: "car",
    name: "CAR Method",
    acronym: "CAR",
    description: "Challenge-Action-Result for problem-solving questions",
    // ... similar structure
  },
  // ... more techniques
];
```

### Knowledge Base Storage
```typescript
// Static knowledge embedded at build time
// Stored in KV or as constants in worker

interface KnowledgeBase {
  techniques: InterviewTechnique[];
  
  // Scenario-specific question patterns
  questionPatterns: {
    scenarioId: string;
    patterns: {
      trigger: string;  // Regex or keyword match
      technique: string;
      coachingHint: string;
    }[];
  }[];
  
  // Common mistakes and coaching
  antiPatterns: {
    pattern: string;  // What to detect
    issue: string;
    coaching: string;
  }[];
  
  // Filler words to track
  fillerWords: string[];
  
  // Positive signals
  positiveSignals: {
    pattern: string;
    feedback: string;
  }[];
}
```

---

## AI Agent Prompt Architecture

### Prompt Layers
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROMPT COMPOSITION                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Layer 1: SYSTEM PROMPT (Static per scenario)                           │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ You are {interviewerName}, a {interviewerRole} at {companyName}.   │ │
│  │ You are conducting a {scenarioType} interview.                      │ │
│  │                                                                     │ │
│  │ Your demeanor: {demeanor}                                          │ │
│  │ Your probing style: {probingLevel}                                 │ │
│  │                                                                     │ │
│  │ Interview structure:                                                │ │
│  │ 1. Warm greeting and introduction                                  │ │
│  │ 2. Ask about their background                                      │ │
│  │ 3. Core questions (mix of deterministic + contextual)              │ │
│  │ 4. Follow-up probes based on responses                             │ │
│  │ 5. Candidate questions                                             │ │
│  │ 6. Wrap up                                                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Layer 2: CONTEXT INJECTION (Dynamic from RAG)                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ ## About the Role                                                   │ │
│  │ {parsedJobDescription summary}                                     │ │
│  │ Key requirements: {requirements}                                   │ │
│  │                                                                     │ │
│  │ ## About the Candidate                                             │ │
│  │ Name: {userName}                                                   │ │
│  │ Current/Recent: {mostRecentExperience}                             │ │
│  │ Key skills: {relevantSkills}                                       │ │
│  │ Notable: {achievements}                                            │ │
│  │                                                                     │ │
│  │ ## Suggested Probes (from resume analysis)                         │ │
│  │ - Ask about their time at {company} doing {project}                │ │
│  │ - Explore the gap between {date1} and {date2}                      │ │
│  │ - Dig into their {skill} experience                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Layer 3: QUESTION BANK (Deterministic + Generated)                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Required questions to ask:                                          │ │
│  │ 1. [DETERMINISTIC] "Tell me about yourself"                        │ │
│  │ 2. [DETERMINISTIC] "Why are you interested in this role?"          │ │
│  │ 3. [CONTEXTUAL] "I see you worked at {company} - tell me about..." │ │
│  │ 4. [DETERMINISTIC] "Tell me about a time you faced conflict"       │ │
│  │ 5. [CONTEXTUAL] "Your resume mentions {project} - walk me through" │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Layer 4: CONVERSATION HISTORY                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ [Previous exchanges in the interview]                               │ │
│  │ Interviewer: "Tell me about yourself"                              │ │
│  │ Candidate: "I'm a software engineer with 5 years..."               │ │
│  │ Interviewer: "Interesting, tell me more about AWS"                 │ │
│  │ Candidate: "At AWS I led a team..."                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Layer 5: CURRENT TRANSCRIPT                                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Candidate just said: "{currentTranscript}"                         │ │
│  │                                                                     │ │
│  │ Generate your next response as the interviewer.                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Prompt Templates per Scenario
```typescript
interface ScenarioPromptTemplate {
  scenarioId: string;
  systemPrompt: string;
  greetingTemplate: string;
  questionTransitions: string[];
  probingPhrases: {
    light: string[];
    moderate: string[];
    deep: string[];
  };
  closingTemplate: string;
}

const BEHAVIORAL_PROMPT: ScenarioPromptTemplate = {
  scenarioId: "behavioral",
  systemPrompt: `You are conducting a behavioral interview. Your goal is to assess the candidate's past behaviors as predictors of future performance.

Key principles:
- Use the STAR method to evaluate responses
- Probe for specifics when answers are vague
- Look for "I" statements, not "we" statements
- Ask follow-up questions to get concrete examples
- Be {demeanor} in your tone
- Your probing level is {probingLevel}

Do NOT:
- Accept hypothetical answers ("I would...")
- Let vague answers slide
- Ask leading questions
- Give away the "right" answer`,

  greetingTemplate: `Hello {userName}! I'm {interviewerName}, {interviewerRole} here at {companyName}. Thanks for taking the time to speak with me today about the {targetRole} position. I've had a chance to review your background, and I'm excited to learn more about your experiences. Before we dive in, do you have any questions about the role or the interview process?`,

  questionTransitions: [
    "That's helpful context. Now I'd like to dig into some specific experiences.",
    "Great, let's explore that further.",
    "Interesting. Can you give me a concrete example?",
    "I'd like to understand that better. Walk me through a specific situation.",
  ],

  probingPhrases: {
    light: [
      "Can you tell me a bit more about that?",
      "What happened next?",
    ],
    moderate: [
      "What specifically was YOUR role in that?",
      "How did you measure the success of that?",
      "What would you do differently?",
    ],
    deep: [
      "I'm not quite getting the specifics. Walk me through exactly what YOU did, step by step.",
      "You mentioned 'we' - what was YOUR individual contribution?",
      "That sounds like a team effort. What decisions did YOU make?",
      "Let's quantify that. What were the actual numbers?",
    ],
  },

  closingTemplate: `Thank you {userName}, this has been a great conversation. I've really enjoyed learning about your experiences. Do you have any questions for me about the role or {companyName}?`,
};
```

---

## Real-Time Insights System

### Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME INSIGHTS PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STT Output (Deepgram)                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ "So basically we had this project and the team worked on it     │    │
│  │  and like it went pretty well I guess"                          │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    PARALLEL ANALYSIS                             │    │
│  ├─────────────────────────────────────────────────────────────────┤    │
│  │                                                                  │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │    │
│  │  │   STAR       │  │   Filler     │  │   Clarity    │           │    │
│  │  │   Detector   │  │   Counter    │  │   Scorer     │           │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │    │
│  │         │                 │                 │                    │    │
│  │         ▼                 ▼                 ▼                    │    │
│  │  Missing: Result    "like": 1         Score: 45/100             │    │
│  │  Has: Situation     "basically": 1    Issue: vague              │    │
│  │                     "I guess": 1      Issue: hedging            │    │
│  │                                                                  │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    INSIGHT PRIORITIZER                           │    │
│  │                                                                  │    │
│  │  Rules:                                                          │    │
│  │  - Max 1 insight at a time (not overwhelming)                   │    │
│  │  - Prioritize actionable over observational                     │    │
│  │  - Don't repeat same insight within 60 seconds                  │    │
│  │  - Match insight to current question type                       │    │
│  │                                                                  │    │
│  └──────────────────────────┬──────────────────────────────────────┘    │
│                             │                                            │
│                             ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    INSIGHTS HUD                                  │    │
│  │  ┌───────────────────────────────────────────────────────────┐  │    │
│  │  │  💡 Add a specific RESULT with numbers                    │  │    │
│  │  │     "This reduced latency by X% and saved $Y"             │  │    │
│  │  └───────────────────────────────────────────────────────────┘  │    │
│  │                                                                  │    │
│  │  Metrics:  Clarity: ██░░░ 45%  |  Fillers: 3  |  STAR: 2/4     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Insight Types
```typescript
interface Insight {
  id: string;
  timestamp: number;
  type: "coaching" | "warning" | "positive" | "metric";
  priority: "high" | "medium" | "low";
  category: "star" | "clarity" | "filler" | "specificity" | "confidence";
  message: string;
  suggestion?: string;
  context?: string;  // What triggered this
  expiresAt?: number;  // Auto-dismiss after
}

// Example insights
const INSIGHT_TEMPLATES = {
  missing_result: {
    type: "coaching",
    priority: "high",
    category: "star",
    message: "📊 Add a specific RESULT",
    suggestion: "Quantify the impact: 'This reduced X by Y%'",
  },
  too_vague: {
    type: "warning",
    priority: "medium",
    category: "specificity",
    message: "🎯 Be more specific",
    suggestion: "Use concrete examples, not generalizations",
  },
  good_star: {
    type: "positive",
    priority: "low",
    category: "star",
    message: "✅ Great STAR response!",
  },
  filler_alert: {
    type: "warning",
    priority: "low",
    category: "filler",
    message: "⚠️ Watch filler words",
    suggestion: "Pause instead of saying 'um' or 'like'",
  },
  use_resume_context: {
    type: "coaching",
    priority: "high",
    category: "specificity",
    message: "💼 Reference your {company} experience",
    suggestion: "Your work on {project} is relevant here",
  },
};
```

### RAG-Powered Insights
```typescript
// When user is answering, query their resume for relevant context
async function generateContextualInsight(
  currentQuestion: string,
  userResponse: string,
  roleplayId: string
): Promise<Insight | null> {
  // Query Vectorize for relevant resume chunks
  const relevantContext = await vectorize.query({
    vector: await embed(currentQuestion),
    filter: { roleplayId, source: "resume" },
    topK: 3,
  });

  // If user isn't mentioning relevant experience, suggest it
  const mentionedCompanies = extractCompanies(userResponse);
  const relevantExperiences = relevantContext.filter(
    ctx => !mentionedCompanies.includes(ctx.metadata.company)
  );

  if (relevantExperiences.length > 0) {
    return {
      type: "coaching",
      priority: "medium",
      category: "specificity",
      message: `💼 Consider mentioning your ${relevantExperiences[0].metadata.company} experience`,
      suggestion: relevantExperiences[0].text.substring(0, 100) + "...",
    };
  }

  return null;
}
```

---

## Final Report Structure

```typescript
interface FinalReport {
  roleplayId: string;
  generatedAt: number;
  duration: number;  // minutes
  
  // Overall Scores
  overallScore: number;  // 0-100
  breakdown: {
    communication: number;
    relevance: number;
    structure: number;
    confidence: number;
    specificity: number;
  };
  
  // Question-by-Question Analysis
  questionAnalysis: {
    question: string;
    questionType: string;
    response: string;
    score: number;
    starAnalysis?: {
      situation: { present: boolean; quality: number };
      task: { present: boolean; quality: number };
      action: { present: boolean; quality: number };
      result: { present: boolean; quality: number };
    };
    strengths: string[];
    improvements: string[];
  }[];
  
  // Aggregate Insights
  topStrengths: string[];
  areasForImprovement: string[];
  
  // Metrics
  metrics: {
    totalFillerWords: number;
    fillerWordBreakdown: Record<string, number>;
    averageResponseLength: number;
    questionsAnswered: number;
    followUpQuestions: number;
  };
  
  // Actionable Recommendations
  recommendations: {
    priority: "high" | "medium" | "low";
    area: string;
    recommendation: string;
    example?: string;
  }[];
  
  // Full Transcript
  transcript: {
    speaker: "interviewer" | "candidate";
    text: string;
    timestamp: number;
    insights?: Insight[];
  }[];
  
  // Comparison (if available)
  comparison?: {
    previousScore?: number;
    improvement?: number;
    consistentStrengths: string[];
    persistentWeaknesses: string[];
  };
}
```

---

## Implementation Phases

### Sprint 3: RAG Foundation
- [ ] Add Vectorize binding to wrangler.jsonc
- [ ] Create document upload UI (JD + Resume)
- [ ] Implement document parsing with Workers AI
- [ ] Create chunking strategy with metadata
- [ ] Implement embedding and indexing
- [ ] Scope all vectors to roleplayId
- [ ] Update SessionManager schema for documents

### Sprint 4: Enhanced Customization
- [ ] Build scenario preset system
- [ ] Create persona customization UI
- [ ] Store all customization in roleplay
- [ ] Build prompt template system
- [ ] Inject context into AI prompts
- [ ] Generate contextual questions from RAG

### Sprint 5: Knowledge Base
- [ ] Define interview technique schemas
- [ ] Create STAR/CAR/etc. detection logic
- [ ] Build question pattern matching
- [ ] Implement anti-pattern detection
- [ ] Store knowledge in KV or constants

### Sprint 6: Real-Time Insights
- [ ] Build Insights HUD component
- [ ] Implement STAR detector
- [ ] Implement filler word counter
- [ ] Implement clarity scorer
- [ ] Create insight prioritization logic
- [ ] Add RAG-powered contextual hints
- [ ] WebSocket for real-time updates

### Sprint 7: Final Report
- [ ] Build report generation logic
- [ ] Create report UI component
- [ ] Implement scoring algorithms
- [ ] Generate recommendations
- [ ] Add transcript with annotations
- [ ] Export functionality (PDF?)

### Sprint 8: Polish & Hardening
- [ ] Error handling throughout
- [ ] Loading states and UX polish
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] E2E testing
- [ ] Documentation

---

## Technical Decisions (FINALIZED)

| Decision | Choice | Reason |
|----------|--------|--------|
| **RAG Scoping** | `roleplayId` | Context (JD, resume, persona) exists before meeting is created |
| **Vectorize Strategy** | Single index with `roleplayId` in metadata | Simple filtering, no namespace complexity |
| **Insights UI** | Side Panel + WebSocket | Clean separation from RTK UI, easy to implement |
| **Insights Delivery** | WebSocket from DO to frontend | Already have DO infrastructure, simpler than DataChannel |
| **Report Generation** | Post-meeting batch | Need full transcript for comprehensive analysis |
| **Transcript Storage** | Durable Object SQL (current) | Already works, no migration needed |
| **Knowledge Base** | Static TypeScript in code | Simple, version controlled, scenario-specific |
| **PDF Parsing** | `unpdf` library | Serverless compatible, works in Workers |

### Meeting UI Layout (Finalized)
```
┌─────────────────────────────────────────────────────────┐
│                    Meeting Screen                        │
├───────────────────────────────┬─────────────────────────┤
│                               │                         │
│      RTK Meeting UI           │    Insights Panel       │
│      (audio controls,         │    - Live coaching      │
│       participants,           │    - STAR progress      │
│       mute/unmute)            │    - Metrics            │
│                               │                         │
└───────────────────────────────┴─────────────────────────┘
```

### Data Flow Confirmation
```
1. User customizes scenario → roleplayId created
2. User uploads JD + Resume → parsed, embedded, indexed with roleplayId
3. User starts interview → meetingId created, agent loads context by roleplayId
4. During meeting → Agent pushes insights via WebSocket to Insights Panel
5. Meeting ends → Full transcript analyzed, report generated
6. Report displayed → User can start new session
```

---

## Testing Strategy

### Incremental Testing Approach
Each feature must be tested before moving to the next:

1. **Test locally with `npm run dev`** for UI and basic functionality
2. **Deploy with `npm run deploy`** to test TTS/STT (required for pipeline)
3. **Use test fixtures** (dummy resume + JD) for consistent RAG testing

### Test Fixtures Location
```
/test-fixtures/
  ├── sample-resume.pdf
  ├── sample-resume.txt
  ├── sample-jd.pdf
  ├── sample-jd.txt
  └── README.md
```

---

*Architecture document created: January 19, 2026*
*Decisions finalized: January 19, 2026*
