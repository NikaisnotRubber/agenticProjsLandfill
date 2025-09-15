import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { EmailManager } from '@/lib/email/email-manager'
import { EmailSchema } from '@/types/email'

// 全局郵件管理器實例（在實際應用中應該使用依賴注入）
let emailManager: EmailManager | null = null

// 驗證環境變數是否為有效值（不是佔位符）
function isValidEnvValue(value: string | undefined): boolean {
  if (!value) return false
  const placeholders = [
    'your_outlook_client_id',
    'your_outlook_client_secret', 
    'your_outlook_tenant_id',
    'your_gmail_client_id',
    'your_gmail_client_secret',
    'your_gmail_refresh_token',
    'your_secret_here'
  ]
  return !placeholders.includes(value.toLowerCase())
}

function getEmailManager(): EmailManager {
  if (!emailManager) {
    // 驗證 Outlook 配置
    const outlookConfigured = process.env.OUTLOOK_CLIENT_ID && 
      isValidEnvValue(process.env.OUTLOOK_CLIENT_ID) &&
      isValidEnvValue(process.env.OUTLOOK_CLIENT_SECRET) &&
      isValidEnvValue(process.env.OUTLOOK_TENANT_ID)

    // 驗證 Gmail 配置
    const gmailConfigured = process.env.GMAIL_CLIENT_ID && 
      isValidEnvValue(process.env.GMAIL_CLIENT_ID) &&
      isValidEnvValue(process.env.GMAIL_CLIENT_SECRET)

    // 從環境變數讀取配置
    const config = {
      outlook: outlookConfigured ? {
        credentials: {
          clientId: process.env.OUTLOOK_CLIENT_ID!,
          clientSecret: process.env.OUTLOOK_CLIENT_SECRET!,
          tenantId: process.env.OUTLOOK_TENANT_ID!
        },
        polling: {
          interval: 60000, // 1分鐘
          enabled: false // API模式下不啟用輪詢
        },
        filters: {
          maxEmailAge: 7 // 7天內的郵件
        }
      } : undefined,
      gmail: gmailConfigured ? {
        credentials: {
          clientId: process.env.GMAIL_CLIENT_ID!,
          clientSecret: process.env.GMAIL_CLIENT_SECRET!,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN!
        },
        polling: {
          interval: 60000,
          enabled: false
        },
        filters: {
          maxEmailAge: 7
        }
      } : undefined,
      enabledServices: [
        ...(outlookConfigured ? ['outlook' as const] : []),
        ...(gmailConfigured ? ['gmail' as const] : [])
      ],
      defaultProcessingConfig: {
        autoMarkAsRead: false,
        autoReply: false,
        batchSize: 5
      }
    }

    emailManager = new EmailManager(config)
  }
  
  return emailManager
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 驗證郵件資料
    const emailData = EmailSchema.parse(body)
    
    // 獲取郵件管理器並處理郵件
    const manager = getEmailManager()
    const result = await manager.processEmail(emailData)
    
    return NextResponse.json({
      success: true,
      result: {
        classification: result.classification,
        messages: result.messages,
        result: result.result,
        error: result.error
      }
    })

  } catch (error: unknown) {
    console.error('Email processing API error:', error)
    
    // 處理 Zod 驗證錯誤
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed: ' + error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ')
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const manager = getEmailManager()
    const status = await manager.getServiceStatus()
    const stats = manager.getStats()
    
    // 同時添加已配置的服務列表到統計資訊
    const configuredServices = []
    if (process.env.OUTLOOK_CLIENT_ID && isValidEnvValue(process.env.OUTLOOK_CLIENT_ID)) {
      configuredServices.push('outlook')
    }
    if (process.env.GMAIL_CLIENT_ID && isValidEnvValue(process.env.GMAIL_CLIENT_ID)) {
      configuredServices.push('gmail')
    }
    
    const enhancedStats = {
      ...stats,
      configuredServices
    }
    
    return NextResponse.json({
      status,
      stats: enhancedStats
    })
    
  } catch (error: unknown) {
    console.error('Email service status API error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 })
  }
}