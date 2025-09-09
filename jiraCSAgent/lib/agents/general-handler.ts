import { BaseAgent } from './base-agent'
import { AgentConfig, WorkflowState } from '@/types/agent'

export class GeneralHandlerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'General Issue Handler',
      type: 'general_handler',
      description: '處理除Jira問題外的其他一般性問題',
      systemPrompt: `你是一個通用問題處理專家代理，負責處理不屬於Jira特定類別的各種問題。你的職責包括：

處理範圍：
1. 一般性IT支援問題
2. 軟體使用諮詢
3. 流程相關問題
4. 帳號與權限問題（非Jira特定）
5. 其他工具整合問題
6. 培訓與指導需求

處理原則：
- 仔細理解用戶需求
- 提供清晰的解決方案
- 如果問題超出能力範圍，建議轉介相關專家
- 提供替代解決方案
- 包含相關資源連結

回應應該：
- 友善且專業
- 結構化且易於理解
- 包含具體的行動步驟
- 提供後續支援建議

如果問題確實應該屬於Jira類別但被錯誤分類，請在回應中指出並建議重新分類。`,
      temperature: 0.5,
      maxTokens: 800,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    super(config)
  }

  async execute(state: WorkflowState): Promise<WorkflowState> {
    const { email, classification } = state

    try {
      const emailContent = `
主題: ${email.subject}
內容: ${email.body}
寄件者: ${email.sender}
分類信心度: ${classification?.confidence}
`

      const prompt = `
請處理以下一般性問題：

${emailContent}

請提供：
1. 問題理解與分析
2. 建議的解決方案
3. 具體執行步驟
4. 相關資源或文檔
5. 後續支援建議

如果你認為此問題實際上屬於Jira相關問題但被錯誤分類，請在回應開頭明確指出並說明理由。
`

      const response = await this.generateResponse(prompt)

      // 檢查是否建議重新分類
      const needsReclassification = response.toLowerCase().includes('錯誤分類') || 
                                  response.toLowerCase().includes('應該屬於jira') ||
                                  response.toLowerCase().includes('重新分類')

      // 更新狀態
      let updatedState = this.addMessage(state, 'human', '正在處理一般性問題...')
      updatedState = this.addMessage(updatedState, 'ai', response)
      updatedState = this.updateResult(
        updatedState,
        'general_resolution',
        response,
        'completed',
        {
          category: 'general',
          handlerAgent: 'general_handler',
          needsReclassification,
          originalConfidence: classification?.confidence
        }
      )

      return updatedState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '處理一般問題時發生錯誤'
      return {
        ...state,
        error: errorMessage,
        result: {
          action: 'general_resolution',
          response: `處理失敗: ${errorMessage}`,
          status: 'failed'
        }
      }
    }
  }
}