import { v4 as uuidv4 } from 'uuid'
import { BaseEmailService, EmailServiceConfig } from './base-email-service'
import { OutlookEmailService } from './outlook-service'
import { GmailEmailService } from './gmail-service'
import { Email, EmailSource } from '@/types/email'
import { WorkflowState } from '@/types/agent'
// import { EmailWorkflowOrchestrator } from '../workflow/orchestrator'
import { LangGraphStyleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph'
// 其他可用選項：
// 1. 簡化增強版本（事件驅動）：
// import { SimpleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-simple'

// 2. LangGraph風格（修正版本）：
// import { LangGraphStyleEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph-fixed'

// 3. LangGraph官方（可能有類型問題）：
// import { LangGraphEmailWorkflowOrchestrator as EmailWorkflowOrchestrator } from '../workflow/orchestrator-langgraph'

export interface EmailManagerConfig {
  outlook?: EmailServiceConfig
  gmail?: EmailServiceConfig
  enabledServices: EmailSource[]
  defaultProcessingConfig?: {
    autoMarkAsRead: boolean
    autoReply: boolean
    batchSize: number
  }
}

export class EmailManager {
  private services: Map<EmailSource, BaseEmailService> = new Map()
  private orchestrator: EmailWorkflowOrchestrator
  private config: EmailManagerConfig
  private isProcessing: boolean = false

  constructor(config: EmailManagerConfig) {
    this.config = config
    this.orchestrator = new EmailWorkflowOrchestrator()
    this.initializeServices()
  }

  private initializeServices() {
    // 初始化Outlook服務
    if (this.config.outlook && this.config.enabledServices.includes('outlook')) {
      const outlookService = new OutlookEmailService(this.config.outlook)
      this.services.set('outlook', outlookService)
    }

    // 初始化Gmail服務
    if (this.config.gmail && this.config.enabledServices.includes('gmail')) {
      const gmailService = new GmailEmailService(this.config.gmail)
      this.services.set('gmail', gmailService)
    }
  }

  async authenticateAll(): Promise<{ [key in EmailSource]?: boolean }> {
    const results: { [key in EmailSource]?: boolean } = {}

    for (const [source, service] of this.services) {
      try {
        console.log(`Authenticating ${source}...`)
        results[source] = await service.authenticate()
        if (results[source]) {
          console.log(`${source} authentication successful`)
        } else {
          console.error(`${source} authentication failed`)
        }
      } catch (error: unknown) {
        console.error(`Error authenticating ${source}:`, error)
        results[source] = false
      }
    }

    return results
  }

  async startEmailProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.warn('Email processing is already running')
      return
    }

    console.log('Starting email processing...')
    this.isProcessing = true

    // 為每個服務啟動輪詢
    for (const [source, service] of this.services) {
      console.log(`Starting polling for ${source}`)
      service.startPolling(async (emails: Email[]) => {
        await this.processEmails(emails)
      }).catch((error: unknown) => {
        console.error(`Error in ${source} polling:`, error)
      })
    }
  }

  async stopEmailProcessing(): Promise<void> {
    console.log('Stopping email processing...')
    this.isProcessing = false
    // 註：實際的停止邏輯需要在BaseEmailService中實現interval清理
  }

  private async processEmails(emails: Email[]): Promise<void> {
    if (!this.isProcessing) {
      return
    }

    console.log(`Processing ${emails.length} emails`)

    const batchSize = this.config.defaultProcessingConfig?.batchSize || 5
    
    // 分批處理郵件
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      await this.processBatch(batch)
    }
  }

  private async processBatch(emails: Email[]): Promise<void> {
    const processingPromises = emails.map(email => this.processEmail(email))
    
    try {
      await Promise.allSettled(processingPromises)
    } catch (error: unknown) {
      console.error('Error processing email batch:', error)
    }
  }

  async processEmail(email: Email): Promise<WorkflowState> {
    console.log(`Processing email: ${email.subject} from ${email.sender}`)

    // 創建初始工作流程狀態
    const initialState: WorkflowState = {
      email,
      messages: [{
        id: uuidv4(),
        type: 'system',
        content: `開始處理郵件: ${email.subject}`,
        timestamp: new Date()
      }]
    }

    try {
      // 執行多代理工作流程
      const finalState = await this.orchestrator.processEmail(initialState)

      // 後處理操作
      await this.postProcessEmail(email, finalState)

      console.log(`Email processing completed for: ${email.subject}`)
      return finalState

    } catch (error: unknown) {
      console.error(`Error processing email ${email.id}:`, error)
      
      const errorState: WorkflowState = {
        ...initialState,
        error: `處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
        result: {
          action: 'error',
          response: '郵件處理失敗',
          status: 'failed'
        }
      }

      return errorState
    }
  }

  private async postProcessEmail(email: Email, finalState: WorkflowState): Promise<void> {
    const service = this.services.get(email.source)
    if (!service) {
      console.warn(`No service found for email source: ${email.source}`)
      return
    }

    try {
      // 標記為已讀
      if (this.config.defaultProcessingConfig?.autoMarkAsRead) {
        await service.markAsRead(email.id)
        console.log(`Marked email as read: ${email.id}`)
      }

      // 自動回覆
      if (this.config.defaultProcessingConfig?.autoReply && finalState.result?.response) {
        const replyContent = this.formatAutoReply(finalState.result.response)
        await service.sendReply(email.id, replyContent)
        console.log(`Auto-reply sent for email: ${email.id}`)
      }

    } catch (error: unknown) {
      console.error(`Error in post-processing for email ${email.id}:`, error)
    }
  }

  private formatAutoReply(response: string): string {
    return `
感謝您的來信。我們已收到您的問題並進行了自動分析。

${response}

如果您需要進一步協助，請回覆此郵件或聯繫我們的支援團隊。

此郵件為系統自動回覆。
---
AgentiMailCS 自動處理系統
`
  }

  // 手動處理單個郵件的API
  async processEmailById(emailSource: EmailSource, emailId: string): Promise<WorkflowState | null> {
    const service = this.services.get(emailSource)
    if (!service) {
      throw new Error(`No service configured for ${emailSource}`)
    }

    // 這裡需要實現根據ID獲取郵件的方法
    // 暫時返回null，實際實現需要各服務提供getEmailById方法
    return null
  }

  // 獲取服務狀態
  async getServiceStatus(): Promise<{ [key in EmailSource]?: { authenticated: boolean; polling: boolean } }> {
    const status: { [key in EmailSource]?: { authenticated: boolean; polling: boolean } } = {}

    for (const [source, service] of this.services) {
      // 實際測試每個服務的認證狀態
      let isAuthenticated = false
      try {
        isAuthenticated = await service.authenticate()
      } catch (error) {
        console.warn(`Authentication test failed for ${source}:`, error)
        isAuthenticated = false
      }

      status[source] = {
        authenticated: isAuthenticated,
        polling: this.isProcessing
      }
    }

    return status
  }

  // 獲取統計資訊
  getStats() {
    return {
      enabledServices: Array.from(this.services.keys()),
      isProcessing: this.isProcessing,
      serviceCount: this.services.size
    }
  }
}