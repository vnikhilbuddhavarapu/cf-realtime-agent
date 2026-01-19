# Test Fixtures

This directory contains sample documents for testing the RAG pipeline.

## Files

### sample-resume.txt
A realistic resume for "Alex Chen", a Senior Software Engineer with:
- 6+ years experience
- AWS, Stripe, startup background
- Strong distributed systems experience
- Quantified achievements (latency improvements, cost savings)
- Relevant skills for the sample JD

### sample-jd.txt
A job description for "Senior Software Engineer - Real-Time Systems" at Cloudflare:
- Real-time communication systems focus
- Distributed systems at scale
- Go, Rust, TypeScript stack
- Clear requirements (required vs nice-to-have)
- Interview process details

## Usage

These files are designed to test:
1. **Document parsing** - Extract structured data from raw text
2. **RAG indexing** - Chunk and embed content with metadata
3. **Context retrieval** - Query relevant experience for interview questions
4. **AI prompts** - Generate contextual interview questions

## Testing Scenarios

### Behavioral Interview
The resume contains STAR-ready experiences:
- "Led a team of 5 engineers to redesign..." (leadership)
- "Reduced infrastructure costs by $2.4M..." (impact)
- "Mentored 3 junior engineers..." (mentorship)

### Technical Interview
Strong technical depth for probing:
- API Gateway caching optimization
- Real-time event processing pipeline
- Microservices migration

### Resume-JD Alignment
Good alignment for testing contextual questions:
- Both focus on distributed systems
- Real-time systems experience matches JD
- AWS/cloud experience relevant
- Some gaps to probe (no Rust experience mentioned)

## Adding PDF Versions

To create PDF versions for testing PDF parsing:
```bash
# Using pandoc (if installed)
pandoc sample-resume.txt -o sample-resume.pdf
pandoc sample-jd.txt -o sample-jd.pdf
```

Or manually create PDFs from the text files using any word processor.
