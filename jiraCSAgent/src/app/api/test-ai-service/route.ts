import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    
    // 檢查必需的環境變數
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY 未配置',
        details: 'AI 服務需要 OPENAI_API_KEY 環境變數'
      }, { status: 500 })
    }

    // 創建 OpenAI 客戶端實例用於測試
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    })

    // 發送簡單的測試訊息
    const testMessage = message || '請回覆 "連接成功" 以確認 AI 服務正常運作'
    
    const startTime = Date.now()
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: testMessage }],
      temperature: 0.1,
      max_tokens: 50
    })
    const endTime = Date.now()

    return NextResponse.json({
      success: true,
      response: {
        message: response.choices[0]?.message?.content || '',
        responseTime: endTime - startTime,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        provider: 'OpenAI Compatible',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        }
      }
    })

  } catch (error: unknown) {
    console.error('AI service test error:', error)
    
    // 處理不同類型的錯誤
    let errorMessage = '未知錯誤'
    let errorDetails = ''
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // 檢查常見的 API 錯誤
      if (error.message.includes('401')) {
        errorDetails = 'API Key 無效或已過期'
      } else if (error.message.includes('403')) {
        errorDetails = 'API Key 權限不足'
      } else if (error.message.includes('429')) {
        errorDetails = 'API 請求次數超過限制'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorDetails = '網路連接問題，請檢查 OPENAI_BASE_URL 設定'
      } else if (error.message.includes('model')) {
        errorDetails = '模型不存在或不可用，請檢查 OPENAI_MODEL 設定'
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails || '連接 AI 服務時發生錯誤'
    }, { status: 500 })
  }
}

export async function GET() {
  // 返回 AI 服務配置資訊（不包含敏感資訊）
  return NextResponse.json({
    configured: Boolean(process.env.OPENAI_API_KEY),
    provider: 'OpenAI Compatible',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    hasApiKey: Boolean(process.env.OPENAI_API_KEY)
  })
}