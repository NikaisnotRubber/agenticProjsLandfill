// Core Jira Issue Input/Output Types
export interface JiraIssueInput {
  forms: {
    "Project ID": string;
    "Issue Type": string;
    Reporter: string;
    Created: string;
    Updated: string;
    Summary: string;
    Comment: {
      Created: string;
      Updated: string;
      Content: string;
    };
  };
}

export interface JiraResponse {
  issue_key: string;
  Source: string; // First 20 characters of Comment.Content
  comment_content: string;
}

// Problem Classification Types
export type ProblemCategory = 'JIRA_SIMPLE' | 'JIRA_COMPLEX' | 'GENERAL';

export interface ClassificationResult {
  category: ProblemCategory;
  confidence: number;
  reasoning: string;
  key_indicators: string[];
}

// Agent Response Types
export interface AgentOutput {
  classification?: string;
  confidence: number;
  suggested_action: string;
  response_content: string;
  metadata: Record<string, any>;
  processing_time?: number;
}

// Workflow Processing Step
export interface ProcessingStep {
  step_name: string;
  agent_name: string;
  timestamp: string;
  input: any;
  output: AgentOutput;
  success: boolean;
  error?: string;
}

// Main Workflow State Interface
export interface WorkflowState {
  // Input data
  original_request: JiraIssueInput;

  // Classification stage
  classification?: ClassificationResult;

  // Processing history
  processing_history: ProcessingStep[];

  // Current response being built
  current_response: string;

  // Quality evaluation
  quality_score?: number;
  quality_feedback?: string;

  // Final output
  final_output?: JiraResponse;

  // Control flow
  current_agent?: string;
  retry_count: number;
  max_retries: number;

  // Metadata
  workflow_id: string;
  started_at: string;
  completed_at?: string;
}

// Specialized Agent Input/Output Types
export interface LoginHandlerInput {
  issue_summary: string;
  comment_content: string;
  metadata: Record<string, any>;
}

export interface PermissionHandlerInput {
  issue_summary: string;
  comment_content: string;
  user_info?: {
    reporter: string;
    department?: string;
  };
  metadata: Record<string, any>;
}

export interface OperationHandlerInput {
  issue_summary: string;
  comment_content: string;
  operation_type?: string;
  metadata: Record<string, any>;
}

export interface GeneralHandlerInput {
  issue_summary: string;
  comment_content: string;
  classification_notes: string;
  metadata: Record<string, any>;
}

// Quality Assessment Types
export interface QualityAssessment {
  score: number; // 0-100
  criteria: {
    relevance: number;
    completeness: number;
    tone: number;
    actionability: number;
    accuracy: number;
  };
  feedback: string;
  requires_improvement: boolean;
  improvement_suggestions: string[];
}

// HTTP Client Configuration
export interface JiraApiConfig {
  baseUrl: string;
  authToken: string;
  endpoint: string;
  timeout: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status_code?: number;
}

// Environment Configuration
export interface Config {
  openai: {
    apiKey: string;
    model: string;
    baseUrl?: string;
  };
  jira: JiraApiConfig;
  app: {
    nodeEnv: string;
    logLevel: string;
    testMode: boolean;
  };
}

// Structured Output Schemas for OpenAI
export const ClassificationSchema = {
  type: "object" as const,
  properties: {
    category: {
      type: "string" as const,
      enum: ["JIRA_SIMPLE", "JIRA_COMPLEX", "GENERAL"]
    },
    confidence: {
      type: "number" as const,
      minimum: 0,
      maximum: 1
    },
    reasoning: {
      type: "string" as const
    },
    key_indicators: {
      type: "array" as const,
      items: {
        type: "string" as const
      }
    }
  },
  required: ["category", "confidence", "reasoning", "key_indicators"]
};

export const AgentOutputSchema = {
  type: "object" as const,
  properties: {
    classification: {
      type: "string" as const
    },
    confidence: {
      type: "number" as const,
      minimum: 0,
      maximum: 1
    },
    suggested_action: {
      type: "string" as const
    },
    response_content: {
      type: "string" as const
    },
    metadata: {
      type: "object" as const
    },
    processing_time: {
      type: "number" as const
    }
  },
  required: ["confidence", "suggested_action", "response_content", "metadata"]
};

export const QualityAssessmentSchema = {
  type: "object" as const,
  properties: {
    score: {
      type: "number" as const,
      minimum: 0,
      maximum: 100
    },
    criteria: {
      type: "object" as const,
      properties: {
        relevance: { type: "number" as const, minimum: 0, maximum: 100 },
        completeness: { type: "number" as const, minimum: 0, maximum: 100 },
        tone: { type: "number" as const, minimum: 0, maximum: 100 },
        actionability: { type: "number" as const, minimum: 0, maximum: 100 },
        accuracy: { type: "number" as const, minimum: 0, maximum: 100 }
      },
      required: ["relevance", "completeness", "tone", "actionability", "accuracy"]
    },
    feedback: {
      type: "string" as const
    },
    requires_improvement: {
      type: "boolean" as const
    },
    improvement_suggestions: {
      type: "array" as const,
      items: {
        type: "string" as const
      }
    }
  },
  required: ["score", "criteria", "feedback", "requires_improvement", "improvement_suggestions"]
};