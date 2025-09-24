import { StateGraph, START, END } from '@langchain/langgraph';
import { randomUUID } from 'crypto';
import { WorkflowStateAnnotation, WorkflowStateUtils } from './state';
import { JiraIssueInput, JiraResponse } from '../types';
import { ProblemClassificationAgent } from '../agents/classifier';
import { LoginHandlerAgent } from '../agents/login-handler';
import { ComplexHandlerAgent } from '../agents/complex-handler';
import { GeneralHandlerAgent } from '../agents/general-handler';
import { QualityEvaluatorAgent } from '../agents/quality-evaluator';
import { JiraApiClient } from '../clients/jira-client';

export class JiraWorkflowOrchestrator {
  private graph: any;
  private classificationAgent: ProblemClassificationAgent;
  private loginHandler: LoginHandlerAgent;
  private complexHandler: ComplexHandlerAgent;
  private generalHandler: GeneralHandlerAgent;
  private qualityEvaluator: QualityEvaluatorAgent;
  private jiraClient: JiraApiClient;

  constructor() {
    this.classificationAgent = new ProblemClassificationAgent();
    this.loginHandler = new LoginHandlerAgent();
    this.complexHandler = new ComplexHandlerAgent();
    this.generalHandler = new GeneralHandlerAgent();
    this.qualityEvaluator = new QualityEvaluatorAgent();
    this.jiraClient = new JiraApiClient();

    this.graph = this.buildGraph();
  }

  private buildGraph() {
    return new StateGraph(WorkflowStateAnnotation)
      // Add nodes
      .addNode('classify', this.classifyNode.bind(this))
      .addNode('login_handler', this.loginHandlerNode.bind(this))
      .addNode('complex_handler', this.complexHandlerNode.bind(this))
      .addNode('general_handler', this.generalHandlerNode.bind(this))
      .addNode('quality_evaluation', this.qualityEvaluationNode.bind(this))
      .addNode('improve_response', this.improveResponseNode.bind(this))
      .addNode('finalize_response', this.finalizeResponseNode.bind(this))
      .addNode('send_to_jira', this.sendToJiraNode.bind(this))
      .addNode('handle_error', this.handleErrorNode.bind(this))

      // Define edges
      .addEdge(START, 'classify')
      .addConditionalEdges(
        'classify',
        this.routeAfterClassification.bind(this),
        {
          'login_handler': 'login_handler',
          'complex_handler': 'complex_handler',
          'general_handler': 'general_handler',
          'error': 'handle_error',
        }
      )
      .addEdge('login_handler', 'quality_evaluation')
      .addEdge('complex_handler', 'quality_evaluation')
      .addEdge('general_handler', 'quality_evaluation')
      .addConditionalEdges(
        'quality_evaluation',
        this.routeAfterQuality.bind(this),
        {
          'improve_response': 'improve_response',
          'finalize_response': 'finalize_response',
          'error': 'handle_error',
        }
      )
      .addConditionalEdges(
        'improve_response',
        this.routeAfterImprovement.bind(this),
        {
          'login_handler': 'login_handler',
          'complex_handler': 'complex_handler',
          'general_handler': 'general_handler',
          'finalize_response': 'finalize_response',
          'error': 'handle_error',
        }
      )
      .addEdge('finalize_response', 'send_to_jira')
      .addEdge('send_to_jira', END)
      .addConditionalEdges(
        'handle_error',
        this.routeAfterError.bind(this),
        {
          'retry': 'classify',
          'end': END,
        }
      );
  }

  // Node implementations
  private async classifyNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('🔍 Classifying problem...');
    return await this.classificationAgent.classify(state);
  }

  private async loginHandlerNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('🔑 Handling login issue...');
    return await this.loginHandler.handle(state);
  }

  private async complexHandlerNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('⚙️ Handling complex technical issue...');
    return await this.complexHandler.handle(state);
  }

  private async generalHandlerNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('📋 Handling general inquiry...');
    return await this.generalHandler.handle(state);
  }

  private async qualityEvaluationNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('✅ Evaluating response quality...');
    return await this.qualityEvaluator.evaluate(state);
  }

  private async improveResponseNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('🔧 Improving response based on quality feedback...');

    if (WorkflowStateUtils.shouldRetry(state)) {
      return WorkflowStateUtils.incrementRetry(state);
    }

    // If max retries reached, proceed with current response
    return {
      next_action: 'finalize_response',
    };
  }

  private async finalizeResponseNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('📝 Finalizing response...');

    const finalOutput = WorkflowStateUtils.buildJiraResponse(state);

    if (!finalOutput) {
      return {
        error_message: 'Failed to build final response',
        has_error: true,
        next_action: 'error',
      };
    }

    return WorkflowStateUtils.markCompleted(state, finalOutput);
  }

  private async sendToJiraNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('📤 Sending response to Jira...');

    if (!state.final_output) {
      return {
        error_message: 'No final output to send',
        has_error: true,
      };
    }

    try {
      const apiResponse = await this.jiraClient.sendResponse(state.final_output);

      if (apiResponse.success) {
        console.log('✅ Response sent successfully to Jira');
        return {
          metadata: {
            jira_response: apiResponse,
            sent_at: new Date().toISOString(),
          },
        };
      } else {
        console.error('❌ Failed to send response to Jira:', apiResponse.error);
        return {
          error_message: `Failed to send to Jira: ${apiResponse.error}`,
          has_error: true,
        };
      }
    } catch (error) {
      console.error('❌ Error sending to Jira:', error);
      return {
        error_message: `Error sending to Jira: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async handleErrorNode(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    console.log('⚠️ Handling error...');
    console.error('Error state:', state.error_message);

    return {
      completed_at: new Date().toISOString(),
    };
  }

  // Routing functions
  private routeAfterClassification(state: typeof WorkflowStateAnnotation.State): string {
    if (state.has_error) return 'error';

    const action = state.next_action;
    if (!action) return 'error';

    return action;
  }

  private routeAfterQuality(state: typeof WorkflowStateAnnotation.State): string {
    if (state.has_error) return 'error';

    const action = state.next_action;
    if (!action) return 'error';

    return action;
  }

  private routeAfterImprovement(state: typeof WorkflowStateAnnotation.State): string {
    if (state.has_error) return 'error';

    if (state.retry_count >= state.max_retries) {
      return 'finalize_response';
    }

    // Re-route to appropriate handler based on classification
    if (state.classification?.category === 'JIRA_SIMPLE') {
      return 'login_handler';
    } else if (state.classification?.category === 'JIRA_COMPLEX') {
      return 'complex_handler';
    } else {
      return 'general_handler';
    }
  }

  private routeAfterError(state: typeof WorkflowStateAnnotation.State): string {
    if (WorkflowStateUtils.shouldRetry(state)) {
      return 'retry';
    }
    return 'end';
  }

  // Public interface
  async processRequest(request: JiraIssueInput): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    workflow_id: string;
    processing_time: number;
  }> {
    const startTime = Date.now();
    const workflowId = randomUUID();

    console.log(`🚀 Starting workflow ${workflowId} for issue: ${request.forms["Project ID"]}`);

    try {
      const initialState = WorkflowStateUtils.createInitialState(request, workflowId);
      const compiledGraph = this.graph.compile();

      const result = await compiledGraph.invoke(initialState);
      const processingTime = Date.now() - startTime;

      console.log(`✅ Workflow ${workflowId} completed in ${processingTime}ms`);

      return {
        success: !result.has_error,
        result,
        error: result.error_message,
        workflow_id: workflowId,
        processing_time: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Workflow ${workflowId} failed:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown workflow error',
        workflow_id: workflowId,
        processing_time: processingTime,
      };
    }
  }

  // Health check and diagnostics
  async healthCheck(): Promise<{
    status: string;
    components: Record<string, boolean>;
    timestamp: string;
  }> {
    const jiraHealth = await this.jiraClient.healthCheck();

    return {
      status: jiraHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      components: {
        jira_client: jiraHealth.status === 'healthy',
        workflow_graph: true, // Graph is always ready if constructor succeeded
        agents: true, // Agents are always ready if constructor succeeded
      },
      timestamp: new Date().toISOString(),
    };
  }
}