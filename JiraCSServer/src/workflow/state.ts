import { Annotation } from "@langchain/langgraph";
import { WorkflowState, ProcessingStep, ClassificationResult, JiraIssueInput, JiraResponse, QualityAssessment } from "../types";

// LangGraph State Annotation for the main workflow
export const WorkflowStateAnnotation = Annotation.Root({
  // Input data - immutable once set
  original_request: Annotation<JiraIssueInput>(),

  // Classification results
  classification: Annotation<ClassificationResult>(),

  // Processing history - accumulates all steps
  processing_history: Annotation<ProcessingStep[]>({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),

  // Current response being built
  current_response: Annotation<string>({
    reducer: (existing, update) => update || existing,
    default: () => "",
  }),

  // Quality assessment
  quality_score: Annotation<number>(),
  quality_feedback: Annotation<string>(),
  quality_assessment: Annotation<QualityAssessment>(),

  // Final output
  final_output: Annotation<JiraResponse>(),

  // Control flow
  current_agent: Annotation<string>({
    reducer: (existing, update) => update || existing,
    default: () => "",
  }),

  retry_count: Annotation<number>({
    reducer: (existing, update) => update !== undefined ? update : existing,
    default: () => 0,
  }),

  max_retries: Annotation<number>({
    reducer: (existing, update) => update !== undefined ? update : existing,
    default: () => 3,
  }),

  // Routing decision
  next_action: Annotation<string>({
    reducer: (existing, update) => update || existing,
    default: () => "",
  }),

  // Metadata
  workflow_id: Annotation<string>(),
  started_at: Annotation<string>(),
  completed_at: Annotation<string>(),

  // Error handling
  error_message: Annotation<string>(),
  has_error: Annotation<boolean>({
    reducer: (existing, update) => update !== undefined ? update : existing,
    default: () => false,
  }),

  // Metadata for additional data
  metadata: Annotation<Record<string, any>>({
    reducer: (existing, update) => ({ ...existing, ...update }),
    default: () => ({}),
  }),
});

// Utility functions for working with workflow state
export class WorkflowStateUtils {
  static createInitialState(request: JiraIssueInput, workflowId: string): Partial<typeof WorkflowStateAnnotation.State> {
    return {
      original_request: request,
      workflow_id: workflowId,
      started_at: new Date().toISOString(),
    };
  }

  static addProcessingStep(
    state: typeof WorkflowStateAnnotation.State,
    step: ProcessingStep
  ): Partial<typeof WorkflowStateAnnotation.State> {
    return {
      processing_history: [step],
      current_agent: step.agent_name,
    };
  }

  static setError(
    state: typeof WorkflowStateAnnotation.State,
    errorMessage: string
  ): Partial<typeof WorkflowStateAnnotation.State> {
    return {
      error_message: errorMessage,
      has_error: true,
    };
  }

  static shouldRetry(state: typeof WorkflowStateAnnotation.State): boolean {
    return state.retry_count < state.max_retries && state.has_error;
  }

  static incrementRetry(state: typeof WorkflowStateAnnotation.State): Partial<typeof WorkflowStateAnnotation.State> {
    return {
      retry_count: state.retry_count + 1,
      has_error: false,
      error_message: undefined,
    };
  }

  static markCompleted(
    state: typeof WorkflowStateAnnotation.State,
    finalOutput: JiraResponse
  ): Partial<typeof WorkflowStateAnnotation.State> {
    return {
      final_output: finalOutput,
      completed_at: new Date().toISOString(),
    };
  }

  static extractSourceFromComment(comment: string): string {
    return comment.substring(0, Math.min(20, comment.length));
  }

  static buildJiraResponse(
    state: typeof WorkflowStateAnnotation.State
  ): JiraResponse | null {
    if (!state.current_response || !state.original_request) {
      return null;
    }

    return {
      issue_key: state.original_request.forms["Project ID"],
      Source: this.extractSourceFromComment(state.original_request.forms.Comment.Content),
      comment_content: state.current_response,
    };
  }

  static getLastProcessingStep(state: typeof WorkflowStateAnnotation.State): ProcessingStep | null {
    if (state.processing_history.length === 0) {
      return null;
    }
    return state.processing_history[state.processing_history.length - 1];
  }

  static getProcessingStepsByAgent(
    state: typeof WorkflowStateAnnotation.State,
    agentName: string
  ): ProcessingStep[] {
    return state.processing_history.filter(step => step.agent_name === agentName);
  }

  static getTotalProcessingTime(state: typeof WorkflowStateAnnotation.State): number {
    return state.processing_history.reduce((total, step) => {
      return total + (step.output.processing_time || 0);
    }, 0);
  }
}