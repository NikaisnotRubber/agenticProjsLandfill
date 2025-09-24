import { config, validateConfig } from '../utils/config';
import { JiraWorkflowOrchestrator } from '../workflow/orchestrator';
import { WorkflowStateAnnotation, WorkflowStateUtils } from '../workflow/state';
import { ProblemClassificationAgent } from '../agents/classifier';
import { JiraApiClient } from '../clients/jira-client';
import { mockJiraIssues, expectedClassifications, testScenarios, getAllTestCases } from './mock-data';

class TestRunner {
  private orchestrator: JiraWorkflowOrchestrator;
  private classifier: ProblemClassificationAgent;
  private jiraClient: JiraApiClient;

  constructor() {
    this.orchestrator = new JiraWorkflowOrchestrator();
    this.classifier = new ProblemClassificationAgent();
    this.jiraClient = new JiraApiClient();
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting JiraCSServer Test Suite');
    console.log('=====================================');

    try {
      // Configuration validation
      await this.testConfiguration();

      // Component health checks
      await this.testHealthChecks();

      // Individual agent tests
      await this.testClassificationAgent();

      // End-to-end workflow tests
      await this.testWorkflowScenarios();

      // Performance tests
      await this.testPerformance();

      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  private async testConfiguration(): Promise<void> {
    console.log('\n📋 Testing Configuration...');

    try {
      validateConfig();
      console.log('✅ Configuration validation passed');

      console.log(`📊 Config status:
      - OpenAI Model: ${config.openai.model}
      - Test Mode: ${config.app.testMode}
      - Jira Base URL: ${config.jira.baseUrl}
      - Node Environment: ${config.app.nodeEnv}`);
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  private async testHealthChecks(): Promise<void> {
    console.log('\n🏥 Testing Health Checks...');

    // Test Jira client health
    const jiraHealth = await this.jiraClient.healthCheck();
    console.log(`📡 Jira Client: ${jiraHealth.status} (Test Mode: ${jiraHealth.testMode})`);

    // Test workflow orchestrator health
    const workflowHealth = await this.orchestrator.healthCheck();
    console.log(`⚙️ Workflow: ${workflowHealth.status}`);
    console.log(`📊 Components: ${JSON.stringify(workflowHealth.components, null, 2)}`);

    if (workflowHealth.status !== 'healthy') {
      throw new Error('Health check failed');
    }

    console.log('✅ All health checks passed');
  }

  private async testClassificationAgent(): Promise<void> {
    console.log('\n🔍 Testing Classification Agent...');

    let correctClassifications = 0;
    const testCases = getAllTestCases();

    for (const testCase of testCases) {
      const issueId = testCase.input.forms["Project ID"];
      console.log(`\n📝 Testing ${issueId}: ${testCase.input.forms.Summary.substring(0, 30)}...`);

      try {
        // Create minimal state for classification testing using utility
        const testState = {
          ...WorkflowStateUtils.createInitialState(testCase.input, `test-${issueId}`),
        } as typeof WorkflowStateAnnotation.State;

        const result = await this.classifier.classify(testState);

        if (result.classification) {
          const predicted = result.classification.category;
          const expected = testCase.expected;
          const confidence = result.classification.confidence;

          console.log(`   🔖 Predicted: ${predicted} (confidence: ${confidence.toFixed(2)})`);
          console.log(`   🎯 Expected: ${expected}`);

          if (predicted === expected) {
            console.log('   ✅ Classification correct');
            correctClassifications++;
          } else {
            console.log('   ❌ Classification incorrect');
            console.log(`   💭 Reasoning: ${result.classification.reasoning}`);
          }
        } else {
          console.log('   ❌ No classification result');
        }
      } catch (error) {
        console.log(`   ❌ Classification failed: ${error}`);
      }
    }

    const accuracy = correctClassifications / testCases.length;
    console.log(`\n📊 Classification Accuracy: ${correctClassifications}/${testCases.length} (${(accuracy * 100).toFixed(1)}%)`);

    if (accuracy < 0.7) {
      throw new Error(`Classification accuracy too low: ${(accuracy * 100).toFixed(1)}%`);
    }

    console.log('✅ Classification agent tests passed');
  }

  private async testWorkflowScenarios(): Promise<void> {
    console.log('\n🔄 Testing End-to-End Workflow Scenarios...');

    for (const scenario of testScenarios) {
      console.log(`\n🎬 Running scenario: ${scenario.name}`);
      console.log(`📄 Description: ${scenario.description}`);

      try {
        const startTime = Date.now();
        const result = await this.orchestrator.processRequest(scenario.input);
        const duration = Date.now() - startTime;

        console.log(`⏱️ Processing time: ${duration}ms`);
        console.log(`🔑 Workflow ID: ${result.workflow_id}`);

        if (result.success) {
          console.log('✅ Workflow completed successfully');

          // Validate the result structure
          if (result.result?.final_output) {
            const output = result.result.final_output;
            console.log(`📤 Generated response for ${output.issue_key}`);
            console.log(`📝 Source: "${output.Source}"`);
            console.log(`💬 Response length: ${output.comment_content.length} characters`);

            // Basic validation
            if (output.issue_key !== scenario.input.forms["Project ID"]) {
              console.log('⚠️ Issue key mismatch');
            }

            if (output.Source.length !== 20 && output.Source.length !== scenario.input.forms.Comment.Content.length) {
              console.log('⚠️ Source field length not exactly 20 characters');
            }
          } else {
            console.log('⚠️ No final output generated');
          }
        } else {
          console.log(`❌ Workflow failed: ${result.error}`);
        }

        // Display processing steps
        if (result.result?.processing_history) {
          console.log('\n📋 Processing Steps:');
          result.result.processing_history.forEach((step: any, index: number) => {
            console.log(`   ${index + 1}. ${step.agent_name}: ${step.step_name} (${step.success ? '✅' : '❌'})`);
            if (step.output.processing_time) {
              console.log(`      ⏱️ ${step.output.processing_time}ms`);
            }
          });
        }

      } catch (error) {
        console.log(`❌ Scenario failed: ${error}`);
      }
    }

    console.log('\n✅ Workflow scenario tests completed');
  }

  private async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');

    const testCase = mockJiraIssues[0]; // Use login issue for performance test
    const iterations = 3;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`🔄 Performance test ${i + 1}/${iterations}`);

      try {
        const startTime = Date.now();
        const result = await this.orchestrator.processRequest(testCase);
        const duration = Date.now() - startTime;

        times.push(duration);
        console.log(`   ⏱️ ${duration}ms`);

        if (!result.success) {
          console.log(`   ❌ Failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error}`);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`\n📊 Performance Results:
      - Average: ${avgTime.toFixed(0)}ms
      - Min: ${minTime}ms
      - Max: ${maxTime}ms`);

      if (avgTime > 30000) { // 30 seconds threshold
        console.log('⚠️ Performance warning: Average response time exceeds 30 seconds');
      } else {
        console.log('✅ Performance tests passed');
      }
    }
  }

  async runQuickTest(): Promise<void> {
    console.log('🚀 Running Quick Test...');

    // Test single scenario
    const testCase = mockJiraIssues[0];
    console.log(`📄 Testing issue: ${testCase.forms.Summary}`);

    try {
      const result = await this.orchestrator.processRequest(testCase);

      console.log(`✅ Quick test ${result.success ? 'PASSED' : 'FAILED'}`);
      console.log(`🔑 Workflow ID: ${result.workflow_id}`);
      console.log(`⏱️ Processing time: ${result.processing_time}ms`);

      if (result.success && result.result?.final_output) {
        console.log(`📤 Response preview: ${result.result.final_output.comment_content.substring(0, 100)}...`);
      }

      if (!result.success) {
        console.log(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Quick test failed: ${error}`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const testRunner = new TestRunner();

  if (args.includes('--quick')) {
    await testRunner.runQuickTest();
  } else {
    await testRunner.runAllTests();
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}