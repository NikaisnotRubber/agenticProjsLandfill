# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **AgentiMailCS** - a sophisticated multi-agent email processing system that intelligently classifies and processes customer support emails from Outlook or Gmail. The system uses OpenAI API, LangChain/LangGraph workflows, and a Neo4j knowledge graph for continuous learning from feedback.

### Core Components

1. **jiraCSAgent** - Next.js 15 frontend with React 19, featuring multi-agent email processing pipelines
2. **KnowledgeBase** - Python-based knowledge extraction and feedback analysis using Graphiti temporal knowledge graphs

## Development Commands

### jiraCSAgent (Next.js Application)
```bash
cd jiraCSAgent

# Development
npm run dev                 # Start development server on http://localhost:3000
npm run build              # Build for production
npm run start              # Start production server

# Code Quality & Type Safety
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript type checking (always run before commits)

# Database Operations (PostgreSQL + Prisma)
npm run db:generate        # Generate Prisma client after schema changes
npm run db:push           # Push schema to database (development)
npm run db:migrate        # Create and run database migrations (production)
npm run db:studio         # Open Prisma Studio for database GUI
npm run db:seed           # Seed database with test data
```

### Python Knowledge Base
```bash
# Install Python dependencies (from project root)
# Uses uv for fast Python package management
pip install -e .

# Run knowledge extraction and analysis agents
python -m KnowledgeBase.agents.extractor    # Extract knowledge from feedback
python -m KnowledgeBase.agents.query        # Query knowledge graph
```

## Architecture

### Multi-Agent Processing Pipeline

The system implements a sophisticated LangGraph-based workflow that processes emails through multiple specialized AI agents:

1. **Email Ingestion** → **Classification** → **Routing** → **Processing** → **Response Generation** → **Feedback Loop**

### Agent Specialization Strategy

- **Email Classifier Agent** (`email-classifier.ts`) - Uses OpenAI to categorize emails into JIRA_SIMPLE, JIRA_COMPLEX, or GENERAL based on content analysis and context clues
- **Jira Simple Handler** (`jira-simple-handler.ts`) - Handles basic user issues like login problems, field configurations, and Confluence integration questions
- **Jira Complex Handler** (`jira-complex-handler.ts`) - Processes technical issues involving Script Runner, external integrations, log analysis, and advanced troubleshooting
- **General Handler** (`general-handler.ts`) - Manages non-Jira inquiries and general customer support questions
- **Feedback Agent** (`feedback-agent.ts`) - Analyzes classification errors and generates improvement suggestions for system learning

### LangGraph Workflow Orchestration

The `orchestrator-langgraph.ts` coordinates the entire processing pipeline using LangGraph's state machine approach, enabling:
- Conditional routing based on classification results
- Error handling and retry mechanisms
- State persistence across processing steps
- Parallel processing capabilities for multiple emails

### Database Schema (PostgreSQL + Prisma)

**Core Models:**
- `Email` - Stores incoming emails with source tracking (Outlook/Gmail), priority levels, and attachment metadata
- `ProcessingResult` - Contains AI classification results with confidence scores, reasoning, key indicators, and processing times
- `Feedback` - Captures user corrections and ratings for continuous system improvement
- `EmailReply` - Manages generated responses with send status tracking

**Key Relationships:**
- One-to-one: Email ↔ ProcessingResult
- One-to-many: Email → Attachments
- One-to-one: ProcessingResult ↔ Feedback
- One-to-one: ProcessingResult ↔ EmailReply

### Knowledge Graph Integration

The system integrates with **Graphiti** (temporal knowledge graphs) via the `KnowledgeBase` Python component:
- Automatic feedback data ingestion into Neo4j
- Pattern analysis for classification improvements
- RAG-based insights for system enhancement
- Historical trend analysis for agent performance

## Configuration

### Required Environment Variables
Create `.env.local` in the jiraCSAgent directory:

```bash
# OpenAI API (required for AI processing)
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# PostgreSQL Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/agentimailcs

# Email Service Integration (optional - for production email fetching)
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_TENANT_ID=your_outlook_tenant_id

GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret

# Application Security
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
```

### Neo4j Knowledge Graph Setup
For Graphiti knowledge base integration:

```bash
# Start Neo4j with Docker (required for KnowledgeBase component)
docker run --name neo4j-graphiti \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/test1234 \
  neo4j:5.22.0

# Environment variables for Python integration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test1234
NEO4J_DATABASE=neo4j
```

## API Endpoints

### Core Email Processing
- `POST /api/email/process` - Main endpoint to process emails through the multi-agent pipeline
- `GET /api/emails` - Retrieve processed emails with pagination
- `GET /api/emails/[id]` - Get specific email details and processing results
- `GET /api/processing-results/stats` - Get processing analytics and performance metrics

### Email Reply Management
- `GET /api/email-replies` - List generated email replies
- `POST /api/email-replies` - Create or update email replies

### System Monitoring
- `POST /api/test-ai-service` - Test OpenAI API connectivity and agent functionality
- `GET /api/processing-results` - Monitor processing status and results

### Email Classification Categories
- **JIRA_SIMPLE** - Basic Jira issues (login, field settings, Confluence integration)
- **JIRA_COMPLEX** - Technical issues (Script Runner, integrations, log analysis, advanced troubleshooting)
- **GENERAL** - Non-Jira related inquiries and general support questions

## Development Workflow

### Before Making Changes
1. Always run type checking: `npm run type-check`
2. Run linting: `npm run lint`
3. For database schema changes: `npm run db:generate && npm run db:push`

### Key Technologies
- **Next.js 15** with React 19 and App Router
- **TypeScript 5.7** for strict type safety
- **Tailwind CSS 3.4** for styling
- **Prisma 5.22** for PostgreSQL ORM
- **LangChain 0.3** + **LangGraph 0.2** for AI agent workflows
- **OpenAI GPT-4** for email classification and processing

### Testing Without Email Integration
- Use `POST /api/test-ai-service` to test AI processing pipeline
- Use the `EmailTestForm` component in the UI for manual testing
- Mock email data is available in the test endpoints

### Python-TypeScript Bridge
The `KnowledgeBase/` directory contains Python agents that integrate with the Next.js app:
- `agents/extractor.py` - Extracts knowledge from feedback data
- `agents/query.py` - Queries the knowledge graph for insights
- Communication happens via the Graphiti integration layer

### Component Structure
- **Dashboard**: `EmailProcessingDashboard.tsx` - Main monitoring interface
- **Testing**: `EmailTestForm.tsx` - Manual email testing interface
- **Status**: `ServiceStatus.tsx` - System health monitoring
- **Details**: `EmailDetailView.tsx` - Individual email processing results
- **Compose**: `EmailReplyComposer.tsx` - Reply generation and editing

# Using Gemini CLI for Large Codebase Analysis



When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive

context window. Use `gemini -p` to leverage Google Gemini's large context capacity.



## File and Directory Inclusion Syntax



Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the

  gemini command:



### Examples:



**Single file analysis:**

gemini -p "@src/main.py Explain this file's purpose and structure"



Multiple files:

gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"



Entire directory:

gemini -p "@src/ Summarize the architecture of this codebase"



Multiple directories:

gemini -p "@src/ @tests/ Analyze test coverage for the source code"



Current directory and subdirectories:

gemini -p "@./ Give me an overview of this entire project"



# Or use --all_files flag:

gemini --all_files -p "Analyze the project structure and dependencies"



Implementation Verification Examples



Check if a feature is implemented:

gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"



Verify authentication implementation:

gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"



Check for specific patterns:

gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"



Verify error handling:

gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"



Check for rate limiting:

gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"



Verify caching strategy:

gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"



Check for specific security measures:

gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"



Verify test coverage for features:

gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"



When to Use Gemini CLI



Use gemini -p when:

- Analyzing entire codebases or large directories

- Comparing multiple large files

- Need to understand project-wide patterns or architecture

- Current context window is insufficient for the task

- Working with files totaling more than 128KB

- Verifying if specific features, patterns, or security measures are implemented

- Checking for the presence of certain coding patterns across the entire codebase



Important Notes



- Paths in @ syntax are relative to your current working directory when invoking gemini

- The CLI will include file contents directly in the context

- No need for --yolo flag for read-only analysis

- Gemini's context window can handle entire codebases that would overflow Claude's context

- When checking implementations, be specific about what you're looking for to get accurate results

