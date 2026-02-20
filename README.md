# CloudSave AI — AWS Infrastructure Cost Optimizer

**Built by LogicSpark Technology LLP**

CloudSave AI is a production-quality, AI-powered AWS infrastructure cost analyzer. Upload your CDK, Terraform, CloudFormation, or ECS task definition files and get instant, specific savings recommendations — no AWS credentials required.

---

## Features

- **Multi-Format Parsing**: AWS CDK (TypeScript/Python/JS), Terraform HCL, CloudFormation YAML/JSON, ECS Task Definitions, ZIP archives, and architecture diagrams
- **15 Anti-Pattern Rules**: Lambda memory/timeout, RDS MultiAZ in dev, ECS over-scaling, API Gateway misuse, S3 lifecycle, NAT Gateway overuse, DynamoDB billing mode, ElastiCache sizing, CloudFront price class, EC2 previous gen
- **AI Explanations**: Claude generates per-issue explanations with risk levels and prerequisites
- **7-Page PDF Reports**: Executive summary, service inventory, cost breakdown, issues, roadmap, and disclaimer
- **Sanity CMS Integration**: Persist reports for future reference
- **Zero AWS Access**: Pure static analysis — no credentials, no API calls to AWS

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | TailwindCSS + shadcn/ui |
| Backend | Next.js API Routes |
| AI | Claude API (Anthropic) |
| CMS | Sanity v3 |
| PDF | @react-pdf/renderer |
| State | Zustand |
| Charts | Recharts |
| Animations | Framer Motion + canvas-confetti |

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd cloudsave-ai
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Required for AI explanations
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional — for saving reports to Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=your-write-token
```

**Get your Anthropic API key**: [console.anthropic.com](https://console.anthropic.com)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Test with Mock Files

Upload any of the test files from `test-files/`:

```bash
# Create a ZIP bundle for comprehensive testing
cd test-files
zip test-bundle.zip test-cdk-stack.ts test-terraform.tf test-cloudformation.yaml test-ecs-task.json
```

Then upload `test-bundle.zip` to CloudSave AI.

---

## Project Structure

```
cloudsave-ai/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing/Upload page
│   ├── dashboard/page.tsx        # Analysis dashboard
│   ├── report/[id]/page.tsx      # Saved report view
│   └── api/                      # API routes
│       ├── analyze/route.ts      # Main analysis endpoint
│       ├── explain/route.ts      # Claude explanation endpoint
│       ├── pdf/route.ts          # PDF generation endpoint
│       └── sanity/route.ts       # Sanity storage endpoint
├── components/
│   ├── upload/                   # File upload components
│   ├── dashboard/                # Analysis dashboard components
│   ├── report/                   # PDF + download components
│   └── shared/                   # Header, Footer, Logo, etc.
├── lib/
│   ├── types/index.ts            # All TypeScript types (source of truth)
│   ├── parsers/                  # CDK, TF, CFN, ECS, ZIP parsers
│   ├── engine/                   # Anti-pattern rules + cost calculator
│   ├── ai/claude.ts              # Claude API integration
│   ├── sanity/                   # Sanity client + schemas
│   ├── pdf/generator.ts          # PDF generation logic
│   └── utils/                    # Constants + formatters
├── store/analysis-store.ts       # Zustand global state
├── test-files/                   # Mock infrastructure files for testing
└── sanity/                       # Sanity Studio config
```

---

## API Reference

### POST /api/analyze

Upload an infrastructure file for analysis.

**Request**: `multipart/form-data` with `file` field

**Response**:
```json
{
  "report": {
    "id": "rpt_abc123",
    "createdAt": "2026-02-20T10:00:00Z",
    "detectedServices": ["Lambda", "RDS", "ECS"],
    "issues": [...],
    "costSummary": {
      "totalCurrentCost": 1420,
      "totalOptimizedCost": 740,
      "totalMonthlySaving": 680,
      "totalAnnualSaving": 8160,
      "savingPercent": 47.9
    },
    "aiExplanations": [...]
  }
}
```

### POST /api/pdf

Generate a PDF from a report.

**Request**: `{ "report": AnalysisReport }`

**Response**: `application/pdf` binary stream

### POST /api/explain

Get Claude AI explanation for a single issue.

**Request**: `{ "issue": DetectedIssue }`

**Response**: `{ "explanation": AIExplanation }`

---

## Detection Rules

| # | Rule | Severity | Est. Saving |
|---|------|----------|-------------|
| 1 | Lambda memory > 2048MB | High | ~$160/mo |
| 2 | Lambda timeout > 300s | Medium | ~$40/mo |
| 3 | RDS MultiAZ in non-prod | **Critical** | ~$200/mo |
| 4 | RDS xlarge in dev | High | ~$300/mo |
| 5 | ECS desiredCount > 2 in non-prod | High | ~$150/mo |
| 6 | ECS Fargate over-allocated | Medium | ~$100/mo |
| 7 | API Gateway + NLB | High | ~$180/mo |
| 8 | REST API vs HTTP API | Medium | ~$70/mo |
| 9 | S3 no lifecycle policy | Medium | ~$50/mo |
| 10 | S3 no intelligent tiering | Low | ~$30/mo |
| 11 | Multiple NAT Gateways | High | ~$90/mo |
| 12 | DynamoDB PROVISIONED billing | Medium | ~$60/mo |
| 13 | ElastiCache oversized | Medium | ~$120/mo |
| 14 | CloudFront PriceClass_All | Low | ~$25/mo |
| 15 | EC2 previous generation | Medium | ~$80/mo |

---

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Add environment variables in Vercel dashboard.

### Important: Vercel Configuration

The `next.config.js` is pre-configured for Vercel with:
- `maxDuration: 60` on the analyze route (Vercel Pro/Teams required for >10s)
- Server-side `@react-pdf/renderer` external package handling

---

## Notes & Limitations

- Analysis is **static only** — no actual AWS API calls are made
- Cost estimates use approximate AWS pricing and assumed usage volumes
- AI explanations require a valid `ANTHROPIC_API_KEY`
- Sanity integration is optional — reports can be analyzed without saving
- PDF generation runs server-side and may timeout on Vercel Hobby plan for large reports

---

## License

MIT — Built with ❤️ by LogicSpark Technology LLP
