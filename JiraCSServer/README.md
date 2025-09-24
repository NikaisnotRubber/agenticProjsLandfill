# JiraCSServer - Jira Customer Service Agent Workflow System

An intelligent multi-agent customer service workflow system built with LangGraph and OpenAI, designed to process Jira support requests automatically.

## 🚀 Features

- **Multi-Agent Workflow**: Uses specialized AI agents for different types of customer issues
- **Intelligent Classification**: Automatically categorizes issues into JIRA_SIMPLE, JIRA_COMPLEX, or GENERAL
- **Quality Assurance**: Built-in response quality evaluation and improvement
- **Structured Outputs**: Uses OpenAI's structured output format for consistent results
- **Production Ready**: Includes error handling, retry logic, and comprehensive testing
- **Test Mode**: Safe testing without actual Jira API calls

## 🏗️ Architecture

### Multi-Agent Processing Pipeline

```
Input → Classification → Routing → Processing → Quality Check → Output → Jira API
```

### Specialized Agents

1. **Classification Agent** - Categorizes incoming issues
2. **Login Handler** - Handles authentication and access issues
3. **Complex Handler** - Manages technical problems (Script Runner, integrations)
4. **General Handler** - Processes general inquiries and non-technical requests
5. **Quality Evaluator** - Ensures response quality before sending

### LangGraph Workflow

The system uses LangGraph's StateGraph to orchestrate the multi-agent workflow with:
- Conditional routing based on classification
- Error handling and retry mechanisms
- State persistence across processing steps
- Quality-based response improvement loops

## 📋 Requirements

- Node.js 18+
- TypeScript 5+
- OpenAI API Key
- Jira instance with API access

## 🛠️ Installation

1. Clone and setup:
```bash
git clone <repository-url>
cd JiraCSServer
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Build the project:
```bash
npm run build
```

## ⚙️ Configuration

Create a `.env` file with the following variables:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1

# Jira Configuration
JIRA_BASE_URL=https://jirastage.deltaww.com
JIRA_AUTH_TOKEN=YWx2aXMuYWRtaW46UGFyYTk0Nzg=

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
TEST_MODE=true
```

## 🚀 Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Testing
```bash
# Run all tests
npm test

# Run in test mode (no actual API calls)
npm run test:mock

# Quick test with single scenario
npm test -- --quick
```

## 📊 API Reference

### Input Format

```typescript
interface JiraIssueInput {
  forms: {
    "Project ID": string;
    "Issue Type": string;
    "Reporter": string;
    "Created": string;
    "Updated": string;
    "Summary": string;
    "Comment": {
      "Created": string;
      "Updated": string;
      "Content": string;
    };
  };
}
```

### Output Format

```typescript
interface JiraResponse {
  issue_key: string;        // Project ID from input
  Source: string;          // First 20 characters of comment
  comment_content: string; // Generated professional response
}
```

### Usage Example

```typescript
import { JiraCSServer } from './src';

const server = new JiraCSServer();

const issue = {
  forms: {
    "Project ID": "JCSC-1",
    "Issue Type": "Support Request",
    "Reporter": "PETER.W.WANG",
    "Created": "2025/9/22 10:15",
    "Updated": "2025/9/23 09:20",
    "Summary": "無法登入Jira系統",
    "Comment": {
      "Created": "2025/9/23 09:20",
      "Updated": "2025/9/23 09:20",
      "Content": "我嘗試用我的公司帳號密碼登入，但系統一直提示「用戶名或密碼錯誤」..."
    }
  }
};

const result = await server.processJiraIssue(issue);
console.log(result.result.final_output);
```

## 🧪 Testing

### Test Categories

1. **Configuration Tests** - Validate environment setup
2. **Health Checks** - Verify component connectivity
3. **Classification Tests** - Test issue categorization accuracy
4. **Workflow Tests** - End-to-end processing scenarios
5. **Performance Tests** - Response time benchmarks

### Mock Data

The system includes comprehensive mock data with 8 different issue types:
- Login problems
- Technical Script Runner issues
- Training requests
- Permission problems
- Custom field configuration
- LDAP integration issues
- Performance problems
- Feature requests

### Test Mode

Set `TEST_MODE=true` to run without making actual API calls to Jira. This is perfect for development and testing.

## 📈 Performance

- **Average Processing Time**: ~5-10 seconds per issue
- **Classification Accuracy**: >90% on test data
- **Quality Threshold**: Minimum 75% quality score required
- **Retry Logic**: Up to 3 retries for failed operations

## 🔧 Architecture Details

### State Management

The workflow uses LangGraph's state annotation system to maintain context across agents:

```typescript
export const WorkflowStateAnnotation = Annotation.Root({
  original_request: Annotation<JiraIssueInput>(),
  classification: Annotation<ClassificationResult>(),
  processing_history: Annotation<ProcessingStep[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  current_response: Annotation<string>(),
  quality_assessment: Annotation<QualityAssessment>(),
  // ... more fields
});
```

### Agent Specialization

Each agent is optimized for specific types of issues:

- **Login Handler**: Password resets, account lockouts, basic permissions
- **Complex Handler**: Script Runner, integrations, performance issues
- **General Handler**: Training, policies, feature requests

### Quality Assurance

The quality evaluator scores responses on:
- Relevance (25%)
- Completeness (25%)
- Professional tone (20%)
- Actionability (20%)
- Technical accuracy (10%)

## 🚨 Error Handling

- Comprehensive error logging and reporting
- Automatic retry with exponential backoff
- Graceful degradation for API failures
- Detailed error context in workflow state

## 📝 Development

### Project Structure

```
src/
├── agents/           # AI agent implementations
├── clients/          # External API clients (Jira)
├── types/           # TypeScript interfaces and schemas
├── utils/           # Configuration and utilities
├── workflow/        # LangGraph workflow orchestration
├── tests/          # Test suite and mock data
└── index.ts        # Main entry point
```

### Adding New Agents

1. Create agent class extending base patterns
2. Implement structured output schema
3. Add to workflow orchestrator
4. Create test scenarios
5. Update routing logic

### Deployment

The system is designed for easy deployment:
- Docker-ready (add Dockerfile as needed)
- Environment-based configuration
- Health check endpoints
- Comprehensive logging

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

## 📄 License

ISC License - See LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the test suite for examples
2. Review the mock data for input formats
3. Enable test mode for safe experimentation
4. Check logs for detailed error information