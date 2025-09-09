import { google } from 'googleapis'
import { BaseEmailService, EmailServiceConfig } from './base-email-service'
import { Email } from '@/types/email'

export class GmailEmailService extends BaseEmailService {
  private gmail: any = null
  private lastHistoryId: string | null = null

  constructor(config: EmailServiceConfig) {
    super(config)
  }

  async authenticate(): Promise<boolean> {
    try {
      const { clientId, clientSecret, refreshToken } = this.config.credentials

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing required Gmail credentials')
      }

      // 設置OAuth2客戶端
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/auth/callback'
      )

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      // 初始化Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      // 測試連接
      await this.gmail.users.getProfile({ userId: 'me' })
      console.log('Gmail authentication successful')
      return true

    } catch (error: unknown) {
      console.error('Gmail authentication failed:', error)
      this.gmail = null
      return false
    }
  }

  async fetchNewEmails(): Promise<Email[]> {
    if (!this.gmail) {
      throw new Error('Not authenticated with Gmail')
    }

    try {
      let messages: any[] = []

      if (this.lastHistoryId) {
        // 使用History API獲取增量更新
        const historyResponse = await this.gmail.users.history.list({
          userId: 'me',
          startHistoryId: this.lastHistoryId,
          historyTypes: ['messageAdded']
        })

        if (historyResponse.data.history) {
          messages = historyResponse.data.history
            .filter((h: any) => h.messagesAdded)
            .flatMap((h: any) => h.messagesAdded.map((m: any) => m.message))
        }

        this.lastHistoryId = historyResponse.data.historyId
      } else {
        // 首次獲取，取得最近24小時的郵件
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        
        const messagesResponse = await this.gmail.users.messages.list({
          userId: 'me',
          q: `after:${Math.floor(yesterday.getTime() / 1000)} in:inbox`,
          maxResults: 50
        })

        messages = messagesResponse.data.messages || []
        
        // 獲取當前historyId
        const profileResponse = await this.gmail.users.getProfile({ userId: 'me' })
        this.lastHistoryId = profileResponse.data.historyId
      }

      if (messages.length === 0) {
        return []
      }

      // 獲取郵件詳細資訊
      const emailPromises = messages.map(async (message: any): Promise<Email | null> => {
        const messageDetails = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        })

        return this.parseGmailMessage(messageDetails.data)
      })

      const emailResults = await Promise.all(emailPromises)
      const emails: Email[] = emailResults.filter((email): email is Email => email !== null)

      console.log(`Fetched ${emails.length} new emails from Gmail`)
      return emails

    } catch (error: unknown) {
      console.error('Error fetching Gmail emails:', error)
      throw error
    }
  }

  async markAsRead(emailId: string): Promise<boolean> {
    if (!this.gmail) {
      throw new Error('Not authenticated with Gmail')
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      })

      return true
    } catch (error: unknown) {
      console.error('Error marking Gmail email as read:', error)
      return false
    }
  }

  async sendReply(emailId: string, content: string): Promise<boolean> {
    if (!this.gmail) {
      throw new Error('Not authenticated with Gmail')
    }

    try {
      // 獲取原始郵件資訊
      const originalMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: emailId,
        format: 'full'
      })

      const headers = originalMessage.data.payload.headers
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
      const from = headers.find((h: any) => h.name === 'From')?.value || ''
      const to = headers.find((h: any) => h.name === 'To')?.value || ''

      // 構造回覆郵件
      const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`
      
      const rawMessage = [
        `To: ${from}`,
        `Subject: ${replySubject}`,
        `In-Reply-To: ${originalMessage.data.id}`,
        `References: ${originalMessage.data.id}`,
        '',
        content
      ].join('\n')

      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

      await this.gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw: encodedMessage
        }
      })

      return true
    } catch (error: unknown) {
      console.error('Error sending Gmail reply:', error)
      return false
    }
  }

  private parseGmailMessage(messageData: any): Email | null {
    try {
      const { id, payload, internalDate } = messageData
      const headers = payload.headers

      const getHeader = (name: string) => 
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

      const subject = getHeader('Subject')
      const from = getHeader('From')
      const to = getHeader('To')

      // 提取郵件內容
      let body = ''
      if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString()
      } else if (payload.parts) {
        body = this.extractBodyFromParts(payload.parts)
      }

      // 處理附件
      const attachments = payload.parts
        ?.filter((part: any) => part.filename && part.filename.length > 0)
        .map((part: any) => ({
          name: part.filename,
          type: part.mimeType,
          content: part.body?.data ? Buffer.from(part.body.data, 'base64').toString() : undefined
        })) || []

      const email: Email = {
        id,
        subject: subject || '(無主題)',
        body: this.cleanText(body),
        sender: this.extractEmailAddress(from),
        receiver: this.extractEmailAddress(to),
        timestamp: new Date(parseInt(internalDate)),
        source: 'gmail',
        attachments: attachments.length > 0 ? attachments : undefined,
        hasLogs: this.extractLogIndicators(body),
        priority: this.determinePriority(subject, body)
      }

      return email

    } catch (error: unknown) {
      console.error('Error parsing Gmail message:', error)
      return null
    }
  }

  private extractBodyFromParts(parts: any[]): string {
    let body = ''
    
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body += Buffer.from(part.body.data, 'base64').toString()
      } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
        // 如果沒有純文本，使用HTML並清理
        const html = Buffer.from(part.body.data, 'base64').toString()
        body = html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ')
      } else if (part.parts) {
        body += this.extractBodyFromParts(part.parts)
      }
    }
    
    return body
  }

  private extractEmailAddress(emailString: string): string {
    const match = emailString.match(/<(.+?)>/)
    return match ? match[1] : emailString.trim()
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
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