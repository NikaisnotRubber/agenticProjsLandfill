import { z } from 'zod'

export const EmailSourceSchema = z.enum(['outlook', 'gmail'])
export type EmailSource = z.infer<typeof EmailSourceSchema>

export const EmailSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string(),
  sender: z.string(),
  receiver: z.string(),
  timestamp: z.union([z.date(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      return new Date(val)
    }
    return val
  }),
  source: EmailSourceSchema,
  attachments: z.array(z.object({
    name: z.string(),
    content: z.string().optional(),
    type: z.string()
  })).optional(),
  hasLogs: z.boolean().default(false),
  priority: z.enum(['low', 'medium', 'high']).default('medium')
})

export type Email = z.infer<typeof EmailSchema>

export const IntentCategorySchema = z.enum([
  'jira_simple',    // 登入、欄位設定等、Confluence聯動
  'jira_complex',   // Script Runner、外部系統交互、含logs
  'general'         // 其他情況
])

export type IntentCategory = z.infer<typeof IntentCategorySchema>

export const ClassificationResultSchema = z.object({
  category: IntentCategorySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  keyIndicators: z.array(z.string()),
  suggestedAction: z.string()
})

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>