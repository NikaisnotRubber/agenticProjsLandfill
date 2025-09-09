import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { EmailManager } from '@/lib/email/email-manager'
import { EmailSchema } from '@/types/email'

// 全局郵件管理器實例（在實際應用中應該使用依賴注入）
let emailManager: EmailManager | null = null

function getEmailManager(): EmailManager {
  if (!emailManager) {
    // 從環境變數讀取配置
    const config = {
      outlook: process.env.OUTLOOK_CLIENT_ID ? {
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
      gmail: process.env.GMAIL_CLIENT_ID ? {
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
        ...(process.env.OUTLOOK_CLIENT_ID ? ['outlook' as const] : []),
        ...(process.env.GMAIL_CLIENT_ID ? ['gmail' as const] : [])
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
    const status = manager.getServiceStatus()
    const stats = manager.getStats()
    
    return NextResponse.json({
      status,
      stats
    })
    
  } catch (error: unknown) {
    console.error('Email service status API error:', error)
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to get status'
    }, { status: 500 })
  }
}