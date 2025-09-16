import { z } from 'zod'
import { EmailSchema, ClassificationResultSchema } from './email'

export const AgentTypeSchema = z.enum([
  'email_classifier',
  'jira_simple_handler',
  'jira_complex_handler', 
  'general_handler',
  'orchestrator',
  'result_evaluator',
  'feedback_processor'
])

export type AgentType = z.infer<typeof AgentTypeSchema>

export const AgentMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['system', 'human', 'ai']),
  content: z.string(),
  timestamp: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val)
    }
    return val
  }),
  metadata: z.record(z.any()).optional()
})

export type AgentMessage = z.infer<typeof AgentMessageSchema>

export const EvaluationResultSchema = z.object({
  isClassificationCorrect: z.boolean(),
  originalCategory: z.enum(['jira_simple', 'jira_complex', 'general']),
  suggestedCategory: z.enum(['jira_simple', 'jira_complex', 'general']).optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  keyEvidence: z.array(z.string()),
  recommendedAction: z.enum(['accept', 'reclassify', 'human_review'])
})

export const FeedbackDataSchema = z.object({
  feedbackId: z.string(),
  timestamp: z.string(),
  originalClassification: z.object({
    category: z.enum(['jira_simple', 'jira_complex', 'general']),
    confidence: z.number(),
    reasoning: z.string(),
    keyIndicators: z.array(z.string())
  }),
  correctClassification: z.object({
    category: z.enum(['jira_simple', 'jira_complex', 'general']),
    confidence: z.number(),
    reasoning: z.string(),
    keyIndicators: z.array(z.string())
  }),
  errorAnalysis: z.object({
    errorType: z.enum(['misclassification', 'low_confidence', 'context_misunderstanding', 'keyword_mismatch']),
    rootCause: z.string(),
    missedSignals: z.array(z.string()),
    incorrectAssumptions: z.array(z.string())
  }),
  scenarioMapping: z.object({
    emailContext: z.object({
      subject: z.string(),
      sender: z.string(),
      contentType: z.string(),
      technicalComplexity: z.enum(['low', 'medium', 'high']),
      domainArea: z.array(z.string())
    }),
    processingContext: z.object({
      initialAgent: z.string(),
      processingSteps: z.array(z.string()),
      identifiedPatterns: z.array(z.string()),
      missingPatterns: z.array(z.string())
    })
  }),
  knowledgeUpdate: z.object({
    newPatterns: z.array(z.object({
      pattern: z.string(),
      category: z.enum(['jira_simple', 'jira_complex', 'general']),
      weight: z.number(),
      contextConditions: z.array(z.string())
    })),
    updatedKeywords: z.array(z.object({
      keyword: z.string(),
      category: z.enum(['jira_simple', 'jira_complex', 'general']),
      importance: z.number(),
      context: z.array(z.string())
    })),
    improvedRules: z.array(z.object({
      rule: z.string(),
      condition: z.string(),
      action: z.string(),
      priority: z.number()
    }))
  }),
  recommendations: z.object({
    modelTraining: z.array(z.string()),
    promptOptimization: z.array(z.string()),
    classificationRules: z.array(z.string()),
    qualityAssurance: z.array(z.string())
  })
})

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>
export type FeedbackData = z.infer<typeof FeedbackDataSchema>

export const WorkflowStateSchema = z.object({
  email: EmailSchema,
  classification: ClassificationResultSchema.optional(),
  currentAgent: AgentTypeSchema.optional(),
  messages: z.array(AgentMessageSchema),
  result: z.object({
    action: z.string(),
    response: z.string(),
    status: z.enum(['pending', 'processing', 'completed', 'failed']),
    metadata: z.record(z.any()).optional()
  }).optional(),
  evaluation: EvaluationResultSchema.optional(),
  feedbackData: FeedbackDataSchema.optional(),
  error: z.object({
    message: z.string(),
    source: z.string(),
    code: z.number().optional(),
    timestamp: z.string().optional()
  }).optional()
})

export type WorkflowState = z.infer<typeof WorkflowStateSchema>

export const AgentConfigSchema = z.object({
  name: z.string(),
  type: AgentTypeSchema,
  description: z.string(),
  systemPrompt: z.string(),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().default(1500),
  model: z.string().default(() => process.env.OPENAI_MODEL || 'gpt-4-turbo-preview')
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>