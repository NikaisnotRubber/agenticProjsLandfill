import { BaseAgent } from './base-agent'
import { AgentConfig, WorkflowState } from '@/types/agent'

export class JiraSimpleHandlerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Jira Simple Issue Handler',
      type: 'jira_simple_handler',
      description: '處理Jira簡單問題，如登入、欄位設定、Confluence聯動',
      systemPrompt: `你是一個專精於處理Jira簡單問題的專家代理。你的主要職責是協助用戶解決：

專業領域：
1. Jira登入相關問題
   - 帳號權限問題
   - 密碼重置
   - SSO設定問題

2. 欄位設定問題
   - 自定義欄位配置
   - 欄位權限設定
   - 欄位顯示問題

3. Confluence聯動問題
   - Jira與Confluence的整合設定
   - 頁面連結問題
   - 權限同步問題

4. 基本操作指導
   - 工作流程設定
   - 通知設定
   - 儀表板配置

回應原則：
- 提供清晰的步驟指引
- 包含相關的截圖說明（如果需要）
- 提供相關文檔連結
- 預防性建議避免類似問題

請以結構化的方式回應，包含：
- 問題診斷
- 解決步驟
- 驗證方法
- 預防建議`,
      temperature: 0.2,
      maxTokens: 800,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    super(config)
  }

  async execute(state: WorkflowState): Promise<WorkflowState> {
    const { email, classification } = state

    console.log('🔧 [JiraSimpleHandler] 開始執行處理...')
    console.log('📧 [JiraSimpleHandler] 處理郵件:', JSON.stringify({
      emailId: email.id,
      subject: email.subject,
      sender: email.sender,
      classification: classification
    }, null, 2))

    try {
      const emailContent = `
主題: ${email.subject}
內容: ${email.body}
分類信心度: ${classification?.confidence}
關鍵指標: ${classification?.keyIndicators?.join(', ')}
`

      const prompt = `
請根據以下Jira簡單問題郵件提供專業的解決方案：

${emailContent}

請提供：
1. 問題診斷
2. 詳細解決步驟
3. 驗證解決方案的方法
4. 預防類似問題的建議
`

      console.log('🤖 [JiraSimpleHandler] 發送AI請求...')
      const response = await this.generateResponseDirect(prompt)
      console.log('✅ [JiraSimpleHandler] AI回應已收到，長度:', response.length)

      // 更新狀態
      let updatedState = this.addMessage(state, 'human', '正在處理Jira簡單問題...')
      updatedState = this.addMessage(updatedState, 'ai', response)

      const resultMetadata = {
        category: 'jira_simple',
        handlerAgent: 'jira_simple_handler',
        responseLength: response.length,
        processingTime: new Date().toISOString()
      }

      updatedState = this.updateResult(
        updatedState,
        'jira_simple_resolution',
        response,
        'completed',
        resultMetadata
      )

      console.log('✅ [JiraSimpleHandler] 處理完成結果:', JSON.stringify({
        action: 'jira_simple_resolution',
        status: 'completed',
        responsePreview: response.substring(0, 100) + '...',
        metadata: resultMetadata,
        messageCount: updatedState.messages.length
      }, null, 2))

      return updatedState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '處理簡單問題時發生錯誤'

      console.error('❌ [JiraSimpleHandler] 處理失敗:', JSON.stringify({
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        emailId: email.id
      }, null, 2))

      const errorState = {
        ...state,
        error: {
          message: errorMessage,
          source: 'jira-simple-handler',
          timestamp: new Date().toISOString()
        },
        result: {
          action: 'jira_simple_resolution',
          response: `處理失敗: ${errorMessage}`,
          status: 'failed' as const
        }
      }

      console.log('❌ [JiraSimpleHandler] 返回錯誤狀態:', JSON.stringify({
        hasError: !!errorState.error,
        hasResult: !!errorState.result,
        resultStatus: errorState.result?.status
      }, null, 2))

      return errorState
    }
  }
}