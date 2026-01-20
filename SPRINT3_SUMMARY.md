# Sprint 3: RAG Pipeline Integration ✅

## Objective
Implement a RAG (Retrieval-Augmented Generation) pipeline to provide contextual awareness to the AI interviewer based on the candidate's resume and job description.

## What We Built

### Core Achievement
- **Document Upload & Parsing**: PDF and text upload with AI-powered structured extraction
- **Semantic Chunking**: Documents split into meaningful chunks with rich metadata
- **Vector Indexing**: Cloudflare Vectorize with 1024-dimension embeddings (bge-large-en-v1.5)
- **Context-Aware AI**: Interview agent now queries relevant context for each response

### RAG Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAG PIPELINE                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Upload (PDF/Text)                                                       │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │
│  │   Parser    │ ──► │   Chunker   │ ──► │  Embedder   │                │
│  │  (unpdf +   │     │  (Semantic  │     │ (bge-large  │                │
│  │  Workers AI)│     │  + Metadata)│     │  1024-dim)  │                │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                │
│                                                  │                       │
│                                                  ▼                       │
│                                          ┌─────────────┐                │
│                                          │  Vectorize  │                │
│                                          │   Index     │                │
│                                          └──────┬──────┘                │
│                                                  │                       │
│  Query (Interview Question)                      │                       │
│       │                                          │                       │
│       ▼                                          ▼                       │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │
│  │   Embed     │ ──► │   Search    │ ──► │   Context   │                │
│  │   Query     │     │  (Filter by │     │   Builder   │                │
│  │             │     │  roleplayId)│     │             │                │
│  └─────────────┘     └─────────────┘     └─────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Files Created

```
worker/rag/
  ├── types.ts      ← Document types, chunk metadata, RAG result types
  ├── parser.ts     ← PDF extraction (unpdf), AI-powered parsing
  ├── chunker.ts    ← Semantic chunking with metadata
  ├── service.ts    ← Embedding, indexing, querying Vectorize
  └── index.ts      ← Module exports
```

### API Endpoints Added

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/health` | GET | Check Vectorize index status |
| `/api/rag/resume` | POST | Upload & index resume (text or PDF) |
| `/api/rag/job-description` | POST | Upload & index JD (text or PDF) |
| `/api/rag/query` | POST | Query vectors by roleplayId |
| `/api/rag/interview-context` | POST | Get combined context for a question |
| `/api/rag/roleplay/:id` | DELETE | Clean up vectors for a roleplay |

### Vectorize Configuration

```bash
# Index created
npx wrangler vectorize create interview-context --dimensions=1024 --metric=cosine

# Metadata indexes for filtering
npx wrangler vectorize create-metadata-index interview-context --property-name=roleplayId --type=string
npx wrangler vectorize create-metadata-index interview-context --property-name=source --type=string
```

**Important**: Vectors inserted before metadata indexes are created won't be filterable. Always create indexes first, then insert vectors.

### Chunk Metadata Schema

```typescript
interface ChunkMetadata {
  roleplayId: string;      // Scopes vectors to specific roleplay
  source: "resume" | "job_description";
  chunkType: "experience" | "skill" | "education" | "project" | 
             "achievement" | "requirement" | "responsibility" | 
             "company_info" | "summary" | "other";
  chunkIndex: number;
  company?: string;        // For experience chunks
  role?: string;           // For experience chunks
  skills?: string[];       // Extracted skills
  timeframe?: string;      // Duration/dates
}
```

### AI Agent Integration

The `InterviewTextProcessor` now:
1. Receives candidate's speech transcript
2. Queries Vectorize for relevant resume/JD context
3. Builds context-aware prompt with candidate background
4. Maintains conversation history (last 6 exchanges)
5. Generates personalized, contextual responses

```typescript
// Example: Query "Tell me about your AWS experience"
// Returns:
{
  "id": "test-rag-002-resume-1",
  "score": 0.7346,
  "metadata": {
    "chunkType": "experience",
    "company": "Amazon Web Services (AWS)",
    "role": "Senior Software Engineer",
    "skills": ["Kinesis", "Lambda", "EC2"],
    "timeframe": "March 2021 - Present"
  }
}
```

## Test Results

### Resume Indexing
```bash
curl -X POST /api/rag/resume -d '{"roleplayId": "test-001", "content": "..."}'
# Result: {"success": true, "chunksIndexed": 9}
```

### JD Indexing
```bash
curl -X POST /api/rag/job-description -d '{"roleplayId": "test-001", "content": "..."}'
# Result: {"success": true, "chunksIndexed": 6}
```

### Context Query
```bash
curl -X POST /api/rag/query -d '{"roleplayId": "test-001", "query": "AWS experience"}'
# Result: 5 matches with scores 0.73, 0.67, 0.63, 0.63, 0.62
```

## Dependencies Added

```json
{
  "unpdf": "^0.x.x"  // Serverless-compatible PDF parsing
}
```

## Configuration Changes

**wrangler.jsonc**:
```json
{
  "vectorize": [{
    "binding": "VECTORIZE",
    "index_name": "interview-context",
    "remote": true
  }]
}
```

**worker/types/index.ts**:
```typescript
export interface Env {
  // ... existing
  VECTORIZE: Vectorize;  // Added
}
```

## Key Learnings

1. **Metadata Indexes Required**: Vectorize filtering only works if metadata indexes are created BEFORE inserting vectors
2. **WARP Interference**: Cloudflare WARP with SSL inspection can cause Workers AI calls to fail locally
3. **Embedding Model**: `@cf/baai/bge-large-en-v1.5` produces 1024-dim vectors with good semantic quality
4. **Batch Processing**: Process embeddings in batches of 10 to avoid rate limits
5. **Scoping by roleplayId**: All vectors are scoped to prevent cross-contamination between interviews

## Test Fixtures

Created sample documents for testing:
```
test-fixtures/
  ├── sample-resume.txt   ← Alex Chen, Sr. SWE at AWS/Stripe
  ├── sample-jd.txt       ← Cloudflare Sr. SWE Real-Time Systems
  └── README.md           ← Usage guide
```

## Next Steps (Sprint 4+)

1. **Frontend Document Upload UI** - Add file upload to persona customization
2. **Knowledge Base** - STAR framework, interview techniques (static)
3. **Real-Time Insights** - Coaching HUD with WebSocket updates
4. **Final Report** - Post-interview analysis and scoring

---

*Sprint 3 completed: January 19, 2026*
