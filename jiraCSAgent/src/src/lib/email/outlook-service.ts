import { Client } from '@microsoft/microsoft-graph-client'
import { BaseEmailService, EmailServiceConfig } from './base-email-service'
import { Email } from '@/types/email'

interface OutlookMessage {
  id: string
  subject: string
  body: {
    content: string
    contentType: string
  }
  from: {
    emailAddress: {
      address: string
      name: string
    }
  }
  toRecipients: Array<{
    emailAddress: {
      address: string
      name: string
    }
  }>
  receivedDateTime: string
  hasAttachments: boolean
  attachments?: Array<{
    name: string
    contentType: string
    size: number
    contentBytes?: string
  }>
  isRead: boolean
}

export class OutlookEmailService extends BaseEmailService {
  private graphClient: Client | null = null
  private lastFetchTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小時前

  constructor(config: EmailServiceConfig) {
    super(config)
  }

  async authenticate(): Promise<boolean> {
    try {
      const { clientId, clientSecret, tenantId } = this.config.credentials

      if (!clientId || !clientSecret || !tenantId) {
        throw new Error('Missing required Outlook credentials')
      }

      // 使用客戶端憑證流程進行認證
      this.graphClient = Client.init({
        authProvider: async (done) => {
          try {
            // 獲取存取令牌
            const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: 'https://graph.microsoft.com/.default',
                grant_type: 'client_credentials'
              }),
            })

            if (!tokenResponse.ok) {
              throw new Error(`Authentication failed: ${tokenResponse.statusText}`)
            }

            const tokenData = await tokenResponse.json()
            done(null, tokenData.access_token)
          } catch (error: unknown) {
            done(error, null)
          }
        },
      })

      // 測試連接
      await this.graphClient.api('/me').get()
      console.log('Outlook authentication successful')
      return true

    } catch (error: unknown) {
      console.error('Outlook authentication failed:', error)
      this.graphClient = null
      return false
    }
  }

  async fetchNewEmails(): Promise<Email[]> {
    if (!this.graphClient) {
      throw new Error('Not authenticated with Outlook')
    }

    try {
      // 獲取收件箱中的新郵件
      const response = await this.graphClient
        .api('/me/mailFolders/inbox/messages')
        .filter(`receivedDateTime gt ${this.lastFetchTime.toISOString()}`)
        .orderby('receivedDateTime desc')
        .expand('attachments')
        .top(50)
        .get()

      const messages: OutlookMessage[] = response.value

      const emails: Email[] = await Promise.all(
        messages.map(async (message) => {
          const email: Email = {
            id: message.id,
            subject: message.subject || '(無主題)',
            body: this.extractTextFromBody(message.body.content, message.body.contentType),
            sender: message.from?.emailAddress?.address || '',
            receiver: message.toRecipients?.[0]?.emailAddress?.address || '',
            timestamp: new Date(message.receivedDateTime),
            source: 'outlook',
            hasLogs: this.extractLogIndicators(message.body.content),
            priority: this.determinePriority(message.subject, message.body.content)
          }

          // 處理附件
          if (message.hasAttachments && message.attachments) {
            email.attachments = message.attachments.map(att => ({
              name: att.name,
              type: att.contentType,
              content: att.contentBytes ? Buffer.from(att.contentBytes, 'base64').toString() : undefined
            }))
          }

          return email
        })
      )

      // 更新最後獲取時間
      if (messages.length > 0) {
        this.lastFetchTime = new Date(messages[0].receivedDateTime)
      }

      console.log(`Fetched ${emails.length} new emails from Outlook`)
      return emails

    } catch (error: unknown) {
      console.error('Error fetching Outlook emails:', error)
      throw error
    }
  }

  async markAsRead(emailId: string): Promise<boolean> {
    if (!this.graphClient) {
      throw new Error('Not authenticated with Outlook')
    }

    try {
      await this.graphClient
        .api(`/me/messages/${emailId}`)
        .patch({
          isRead: true
        })

      return true
    } catch (error: unknown) {
      console.error('Error marking email as read:', error)
      return false
    }
  }

  async sendReply(emailId: string, content: string): Promise<boolean> {
    if (!this.graphClient) {
      throw new Error('Not authenticated with Outlook')
    }

    try {
      const replyMessage = {
        message: {
          body: {
            contentType: 'HTML',
            content: content
          }
        }
      }

      await this.graphClient
        .api(`/me/messages/${emailId}/reply`)
        .post(replyMessage)

      return true
    } catch (error: unknown) {
      console.error('Error sending reply:', error)
      return false
    }
  }

  private extractTextFromBody(content: string, contentType: string): string {
    if (contentType === 'html') {
      // 移除HTML標籤的簡單方法
      return content.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
    }
    return content
  }

  private determinePriority(subject: string, body: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = ['urgent', 'critical', 'emergency', '緊急', '嚴重', '關鍵']
    const highKeywords = ['important', 'asap', '重要', '儘快']
    
    const text = (subject + ' ' + body).toLowerCase()
    
    if (urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'high'
    } else if (highKeywords.some(keyword => text.includes(keyword))) {
      return 'medium'
    }
    
    return 'low'
  }
}