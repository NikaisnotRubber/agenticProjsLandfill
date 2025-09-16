# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-agent email processing system called **AgentiMailCS** that intelligently classifies and processes emails from Outlook or Gmail using OpenAI API and LangGraph. The system consists of two main components:

1. **jiraCSAgent** - Next.js frontend application with multi-agent email processing
2. **KnowledgeBase** - Python-based knowledge extraction agents using Graphiti

## Development Commands

### jiraCSAgent (Next.js Application)
```bash
cd jiraCSAgent

# Development
npm run dev                 # Start development server
npm run build              # Build for production
npm run start              # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run type-check         # Run TypeScript type checking

# Database Operations
npm run db:generate        # Generate Prisma client
npm run db:push           # Push schema to database
npm run db:migrate        # Run database migrations
npm run db:studio         # Open Prisma Studio
npm run db:seed           # Seed database with test data
```

### Python Knowledge Base
```bash
# Install Python dependencies (from root)
# Uses uv for dependency management as defined in pyproject.toml
pip install -e .

# Run knowledge extraction agents
python -m KnowledgeBase.agents.extractor
python -m KnowledgeBase.agents.query
```

## Architecture

### jiraCSAgent Structure
```
jiraCSAgent/src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes for email processing
│   │   ├── email/process/ # Main email processing endpoint
│   │   ├── emails/        # Email management
│   │   └── processing-results/ # Results and statistics
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Dashboard page
├── components/            # React components
│   ├── EmailProcessingDashboard.tsx # Main monitoring interface
│   ├── EmailTestForm.tsx  # Email testing interface
│   └── ServiceStatus.tsx  # Service health monitoring
├── lib/                   # Core business logic
│   ├── agents/           # AI agents for email processing
│   │   ├── email-classifier.ts    # Email classification
│   │   ├── jira-simple-handler.ts # Simple Jira issues
│   │   ├── jira-complex-handler.ts # Complex technical issues
│   │   ├── general-handler.ts     # General inquiries
│   │   └── feedback-agent.ts      # Feedback processing
│   ├── email/            # Email service integrations
│   │   ├── outlook-service.ts     # Microsoft Graph API
│   │   ├── gmail-service.ts       # Google Gmail API
│   │   └── email-manager.ts       # Service coordinator
│   ├── workflow/         # LangGraph workflow orchestration
│   │   └── orchestrator-langgraph.ts
│   └── services/         # External service clients
└── types/                # TypeScript type definitions
```

### Multi-Agent Workflow
The system uses three specialized agents:
1. **Jira Simple Handler** - Login issues, field settings, Confluence integration
2. **Jira Complex Handler** - Script Runner, external integrations, log analysis  
3. **General Handler** - Other types of inquiries

### Database Schema
Uses PostgreSQL with Prisma ORM. Key models:
- **Email** - Stores incoming emails with metadata
- **ProcessingResult** - AI classification and processing results
- **Feedback** - User feedback for system improvement
- **EmailReply** - Generated responses to emails

## Configuration

### Environment Variables (.env.local)
```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agentimailcs

# Email Integrations (optional)
OUTLOOK_CLIENT_ID=your_outlook_client_id
OUTLOOK_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_TENANT_ID=your_outlook_tenant_id

GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret

# Application
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
```

### Neo4j Integration (for Graphiti Knowledge Base)
```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=test1234
NEO4J_DATABASE=neo4j

# Start Neo4j with Docker
docker run --name neo4j-graphiti -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/test1234 neo4j:5.22.0
```

## Key Features

### Email Processing Pipeline
1. **Email Ingestion** - Fetch from Outlook/Gmail APIs
2. **Content Analysis** - Extract text, detect logs/attachments
3. **AI Classification** - Categorize into JIRA_SIMPLE, JIRA_COMPLEX, or GENERAL
4. **Agent Processing** - Route to appropriate specialized agent
5. **Response Generation** - Generate contextual responses
6. **Feedback Collection** - Capture user feedback for improvement

### Email Classification Categories
- **JIRA_SIMPLE** - Basic Jira issues (login, fields, Confluence)
- **JIRA_COMPLEX** - Technical issues (Script Runner, logs, integrations)
- **GENERAL** - Non-Jira related inquiries

### Knowledge Base Integration
- Uses Graphiti for temporal knowledge graphs
- Stores feedback data for pattern analysis
- Enables RAG-based insights and system improvement
- Python agents extract and query knowledge

## API Endpoints

### Core Processing
- `POST /api/email/process` - Process single email
- `GET /api/emails` - List processed emails
- `GET /api/processing-results/stats` - Processing statistics

### Testing & Monitoring
- `POST /api/test-ai-service` - Test AI service connection
- `GET /api/email/process` - Service health status

## Development Notes

### Framework Versions
- **Next.js 15** with React 19
- **TypeScript 5.7** for type safety
- **Tailwind CSS 3.4** for styling
- **Prisma 5.22** for database ORM
- **LangChain 0.3** + **LangGraph 0.6** for AI workflows

### Database Operations
Always run type checking and database migrations when making schema changes:
```bash
npm run type-check
npm run db:generate
npm run db:push
```

### Testing Email Processing
Use the `/api/test-ai-service` endpoint or the EmailTestForm component to test AI processing without real email integration.

### Python Integration
The KnowledgeBase directory contains Python agents that work with the Graphiti knowledge graph for feedback analysis and system improvement.

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

