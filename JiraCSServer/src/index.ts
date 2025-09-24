import { JiraWorkflowOrchestrator } from './workflow/orchestrator';
import { validateConfig, config } from './utils/config';
import { JiraIssueInput } from './types';

export class JiraCSServer {
  private orchestrator: JiraWorkflowOrchestrator;

  constructor() {
    try {
      validateConfig();
      this.orchestrator = new JiraWorkflowOrchestrator();
      console.log('✅ JiraCSServer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize JiraCSServer:', error);
      throw error;
    }
  }

  async processJiraIssue(issue: JiraIssueInput) {
    console.log(`🎯 Processing Jira issue: ${issue.forms["Project ID"]}`);
    return await this.orchestrator.processRequest(issue);
  }

  async healthCheck() {
    return await this.orchestrator.healthCheck();
  }

  getConfig() {
    return {
      model: config.openai.model,
      testMode: config.app.testMode,
      nodeEnv: config.app.nodeEnv,
    };
  }
}

// Export main classes for external use
export { JiraWorkflowOrchestrator } from './workflow/orchestrator';
export { ProblemClassificationAgent } from './agents/classifier';
export { LoginHandlerAgent } from './agents/login-handler';
export { ComplexHandlerAgent } from './agents/complex-handler';
export { GeneralHandlerAgent } from './agents/general-handler';
export { QualityEvaluatorAgent } from './agents/quality-evaluator';
export { JiraApiClient } from './clients/jira-client';
export * from './types';

// Example usage when run directly
async function main() {
  try {
    console.log('🚀 Starting JiraCSServer...');

    const server = new JiraCSServer();

    // Health check
    const health = await server.healthCheck();
    console.log('🏥 Health status:', health.status);
    console.log('📊 Components:', health.components);

    // Example issue processing
    const exampleIssue: JiraIssueInput = {
      forms: {
        "Project ID": "DEMO-1",
        "Issue Type": "Support Request",
        "Reporter": "DEMO.USER",
        "Created": new Date().toISOString(),
        "Updated": new Date().toISOString(),
        "Summary": "測試工單：無法登入系統",
        "Comment": {
          "Created": new Date().toISOString(),
          "Updated": new Date().toISOString(),
          "Content": "這是一個測試工單，用來驗證系統是否正常運作。我無法登入到Jira系統，請協助檢查。"
        }
      }
    };

    console.log('\n🎬 Processing example issue...');
    const result = await server.processJiraIssue(exampleIssue);

    console.log('\n📋 Processing Result:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Workflow ID: ${result.workflow_id}`);
    console.log(`- Processing Time: ${result.processing_time}ms`);

    if (result.success && result.result?.final_output) {
      console.log('\n📤 Generated Response:');
      console.log(`Issue Key: ${result.result.final_output.issue_key}`);
      console.log(`Source: ${result.result.final_output.Source}`);
      console.log(`Response:\n${result.result.final_output.comment_content}`);
    }

    if (!result.success) {
      console.error(`❌ Processing failed: ${result.error}`);
    }

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Application failed:', error);
    process.exit(1);
  });
}