import { Email } from '@/types/email'

export interface EmailCredentials {
  clientId: string
  clientSecret: string
  tenantId?: string // For Outlook
  refreshToken?: string
  accessToken?: string
}

export interface EmailServiceConfig {
  credentials: EmailCredentials
  polling: {
    interval: number // 輪詢間隔（毫秒）
    enabled: boolean
  }
  filters: {
    senderWhitelist?: string[] // 允許的寄件者列表
    subjectKeywords?: string[] // 主題關鍵字過濾
    maxEmailAge?: number // 最大郵件年齡（天）
  }
}

export abstract class BaseEmailService {
  protected config: EmailServiceConfig

  constructor(config: EmailServiceConfig) {
    this.config = config
  }

  // 抽象方法，子類必須實現
  abstract authenticate(): Promise<boolean>
  abstract fetchNewEmails(): Promise<Email[]>
  abstract markAsRead(emailId: string): Promise<boolean>
  abstract sendReply(emailId: string, content: string): Promise<boolean>

  // 通用方法
  protected shouldProcessEmail(email: Email): boolean {
    const { filters } = this.config

    // 檢查寄件者白名單
    if (filters.senderWhitelist && filters.senderWhitelist.length > 0) {
      if (!filters.senderWhitelist.some(sender => email.sender.includes(sender))) {
        return false
      }
    }

    // 檢查主題關鍵字
    if (filters.subjectKeywords && filters.subjectKeywords.length > 0) {
      if (!filters.subjectKeywords.some(keyword => 
        email.subject.toLowerCase().includes(keyword.toLowerCase())
      )) {
        return false
      }
    }

    // 檢查郵件年齡
    if (filters.maxEmailAge) {
      const emailAge = (Date.now() - email.timestamp.getTime()) / (1000 * 60 * 60 * 24)
      if (emailAge > filters.maxEmailAge) {
        return false
      }
    }

    return true
  }

  protected extractLogIndicators(emailBody: string): boolean {
    const logKeywords = [
      'error', 'exception', 'stack trace', 'log', 'debug',
      'warning', 'fatal', '錯誤', '例外', '日誌', '記錄',
      'stacktrace', 'traceback', 'caught exception'
    ]

    return logKeywords.some(keyword => 
      emailBody.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  // 輪詢新郵件
  async startPolling(onNewEmail: (emails: Email[]) => void): Promise<void> {
    if (!this.config.polling.enabled) {
      console.warn('Email polling is disabled')
      return
    }

    const poll = async () => {
      try {
        const newEmails = await this.fetchNewEmails()
        const filteredEmails = newEmails.filter(email => this.shouldProcessEmail(email))
        
        if (filteredEmails.length > 0) {
          onNewEmail(filteredEmails)
        }
      } catch (error: unknown) {
        console.error('Error during email polling:', error)
      }
    }

    // 立即執行一次
    await poll()

    // 設置定期輪詢
    setInterval(poll, this.config.polling.interval)
  }
}