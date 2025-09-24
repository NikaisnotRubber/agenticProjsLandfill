// Jira 客服工作流系統專用類型定義

import { z } from 'zod'

// 輸入格式 - Jira Issue JSON Schema
export const JiraIssueInputSchema = z.object({
  forms: z.object({
    "Project ID": z.string(),
    "Issue Type": z.string(),
    "Reporter": z.string(),
    "Created": z.string(),
    "Updated": z.string(),
    "Summary": z.string(),
    "Comment": z.object({
      "Created": z.string(),
      "Updated": z.string(),
      "Content": z.string()
    })
  })
})

// 輸出格式 - 處理後的回復 Schema
export const JiraResponseSchema = z.object({
  issue_key: z.string(),
  Source: z.string(), // Comment.Content 的前 20 個字符
  comment_content: z.string() // 生成的專業客服回復
})

// Agent 輸出的結構化格式 - 基礎架構
export const AgentOutputSchema = z.object({
  classification: z.string(),
  confidence: z.number().min(0).max(1),
  suggested_action: z.string(),
  response_content: z.string(),
  metadata: z.record(z.any()).optional()
})

// 問題分類 Agent 的結構化輸出
export const ProblemClassifierOutputSchema = z.object({
  classification: z.enum(['login_issues', 'permission_issues', 'operation_guidance', 'general_support']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  key_indicators: z.array(z.string()),
  suggested_handler: z.string(),
  urgency_level: z.enum(['low', 'medium', 'high']),
  metadata: z.record(z.any()).optional()
})

// 登入問題處理 Agent 輸出
export const LoginHandlerOutputSchema = z.object({
  problem_type: z.enum(['password_reset', 'account_locked', 'sso_issue', 'permission_denied', 'browser_issue']),
  solution_steps: z.array(z.string()),
  response_content: z.string(),
  requires_admin_action: z.boolean(),
  estimated_resolution_time: z.string(),
  follow_up_actions: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional()
})

// 權限問題處理 Agent 輸出
export const PermissionHandlerOutputSchema = z.object({
  permission_level: z.enum(['project', 'global', 'scheme', 'field', 'workflow']),
  required_permissions: z.array(z.string()),
  response_content: z.string(),
  escalation_needed: z.boolean(),
  admin_contacts: z.array(z.string()).optional(),
  documentation_links: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional()
})

// 操作指導 Agent 輸出
export const OperationGuidanceOutputSchema = z.object({
  operation_category: z.enum(['workflow', 'configuration', 'reporting', 'integration', 'customization']),
  step_by_step_guide: z.array(z.object({
    step_number: z.number(),
    description: z.string(),
    action: z.string(),
    screenshot_needed: z.boolean().optional()
  })),
  response_content: z.string(),
  documentation_links: z.array(z.string()),
  related_features: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional()
})

// 一般支援 Agent 輸出
export const GeneralSupportOutputSchema = z.object({
  support_category: z.enum(['technical_question', 'feature_request', 'bug_report', 'billing', 'training']),
  response_content: z.string(),
  requires_escalation: z.boolean(),
  escalation_department: z.string().optional(),
  suggested_follow_up: z.array(z.string()),
  resource_links: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  metadata: z.record(z.any()).optional()
})

// 品質評估 Agent 輸出
export const QualityAssessmentOutputSchema = z.object({
  overall_score: z.number().min(0).max(10),
  dimensions: z.object({
    appropriateness: z.number().min(0).max(1),
    completeness: z.number().min(0).max(1),
    clarity: z.number().min(0).max(1),
    professionalism: z.number().min(0).max(1),
    technical_accuracy: z.number().min(0).max(1)
  }),
  classification_accuracy_check: z.boolean(),
  response_quality_check: z.boolean(),
  suggested_improvements: z.array(z.string()),
  approved: z.boolean(),
  requires_revision: z.boolean(),
  recommended_action: z.enum(['accept', 'revise', 'escalate', 'reclassify']),
  revision_notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// 工作流狀態類型
export interface JiraWorkflowState {
  // 原始輸入
  original_request: z.infer<typeof JiraIssueInputSchema>

  // 分類結果
  classification?: {
    category: 'login_issues' | 'permission_issues' | 'operation_guidance' | 'general_support'
    confidence: number
    reasoning: string
    key_indicators: string[]
  }

  // 處理歷史
  processing_history: ProcessingStep[]

  // 當前回復內容
  current_response?: string

  // 品質評分
  quality_score?: number

  // 最終輸出
  final_output?: z.infer<typeof JiraResponseSchema>

  // 錯誤處理
  error?: {
    message: string
    source: string
    timestamp: string
  }

  // Agent 協作上下文
  agent_context: {
    current_agent: string
    previous_agents: string[]
    retry_count: number
    max_retries: number
  }
}

// 處理步驟記錄
export interface ProcessingStep {
  step_id: string
  agent_name: string
  timestamp: string
  input_state: Partial<JiraWorkflowState>
  output_state: Partial<JiraWorkflowState>
  processing_time_ms: number
  success: boolean
  error?: string
  metadata?: Record<string, any>
}

// Agent 基礎類型
export interface IJiraAgent {
  name: string
  execute(state: JiraWorkflowState): Promise<JiraWorkflowState>
  canHandle(state: JiraWorkflowState): boolean
  getConfidence(state: JiraWorkflowState): number
}

// 品質評估結果
export interface QualityAssessment {
  overall_score: number // 0-1
  appropriateness: number // 內容適當性
  completeness: number // 解決方案完整性
  clarity: number // 回覆清晰度
  professionalism: number // 專業程度
  suggested_improvements: string[]
  requires_revision: boolean
  recommended_action: 'accept' | 'revise' | 'escalate' | 'reclassify'
}

// HTTP 客戶端配置
export interface JiraApiConfig {
  baseUrl: string
  endpoint: string
  method: 'POST' | 'GET' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  timeout: number
  retryAttempts: number
  testMode: boolean // 測試模式不實際發送請求
}

// 工作流配置
export interface WorkflowConfig {
  maxProcessingSteps: number
  enableQualityAssurance: boolean
  enableFeedbackLoop: boolean
  confidenceThreshold: number
  apiConfig: JiraApiConfig
  openai: {
    model: string
    temperature: number
    maxTokens: number
    enableStructuredOutputs: boolean
  }
}

// 統計和監控
export interface WorkflowStatistics {
  total_processed: number
  successful_completions: number
  failed_processing: number
  average_processing_time_ms: number
  classification_accuracy: number
  quality_scores: {
    average: number
    distribution: Record<string, number>
  }
  agent_performance: Record<string, {
    total_calls: number
    success_rate: number
    average_processing_time: number
    confidence_scores: number[]
  }>
}

// 類型導出
export type JiraIssueInput = z.infer<typeof JiraIssueInputSchema>
export type JiraResponse = z.infer<typeof JiraResponseSchema>
export type AgentOutput = z.infer<typeof AgentOutputSchema>
export type ProblemClassifierOutput = z.infer<typeof ProblemClassifierOutputSchema>
export type LoginHandlerOutput = z.infer<typeof LoginHandlerOutputSchema>
export type PermissionHandlerOutput = z.infer<typeof PermissionHandlerOutputSchema>
export type OperationGuidanceOutput = z.infer<typeof OperationGuidanceOutputSchema>
export type GeneralSupportOutput = z.infer<typeof GeneralSupportOutputSchema>
export type QualityAssessmentOutput = z.infer<typeof QualityAssessmentOutputSchema>

// 常量定義
export const JIRA_ISSUE_CATEGORIES = {
  LOGIN_ISSUES: 'login_issues',
  PERMISSION_ISSUES: 'permission_issues',
  OPERATION_GUIDANCE: 'operation_guidance',
  GENERAL_SUPPORT: 'general_support'
} as const

export const QUALITY_THRESHOLDS = {
  MINIMUM_ACCEPTANCE: 0.7,
  GOOD_QUALITY: 0.8,
  EXCELLENT_QUALITY: 0.9
} as const

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  maxProcessingSteps: 10,
  enableQualityAssurance: true,
  enableFeedbackLoop: true,
  confidenceThreshold: 0.7,
  apiConfig: {
    baseUrl: 'https://jirastage.deltaww.com',
    endpoint: '/rest/scriptrunner/latest/custom/JiraPostRecv',
    method: 'POST',
    headers: {
      'Authorization': 'Basic YWx2aXMuYWRtaW46UGFyYTk0Nzg=',
      'Content-Type': 'application/json'
    },
    timeout: 30000,
    retryAttempts: 3,
    testMode: false
  },
  openai: {
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    enableStructuredOutputs: true
  }
}