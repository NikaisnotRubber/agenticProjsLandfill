import { BaseAgent } from './base-agent'
import { AgentConfig, WorkflowState } from '@/types/agent'

export class JiraComplexHandlerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Jira Complex Issue Handler',
      type: 'jira_complex_handler',
      description: '處理Jira複雜問題，包括Script Runner、外部系統整合、日誌分析',
      systemPrompt: `你是一個專精於處理Jira複雜技術問題的資深專家代理。你的專業領域包括：

核心專業：
1. Script Runner相關問題
   - Groovy腳本除錯
   - 後置函數(Post Functions)配置
   - 條件腳本(Condition Scripts)
   - 驗證器(Validators)設定
   - 自動化規則腳本

2. 外部系統整合
   - REST API整合問題
   - Webhook配置
   - 第三方應用連接
   - 資料同步問題
   - 認證與授權設定

3. 日誌分析與除錯
   - 錯誤日誌解讀
   - 效能問題診斷
   - 系統監控與警告
   - 故障排除流程

4. 高級配置問題
   - JQL查詢優化
   - 大型企業環境配置
   - 效能調整
   - 資料遷移問題

分析方法：
- 詳細的錯誤日誌分析
- 系統架構評估
- 效能瓶頸識別
- 安全性考量
- 最佳實踐建議

回應格式應包含：
- 技術問題診斷
- 根本原因分析
- 分階段解決方案
- 程式碼範例（如適用）
- 測試建議
- 監控與預防措施`,
      temperature: 0.1,
      maxTokens: 1200,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    super(config)
  }

  async execute(state: WorkflowState): Promise<WorkflowState> {
    const { email, classification } = state

    try {
      // 分析是否包含日誌資訊
      const hasLogs = email.hasLogs || email.body.includes('error') || email.body.includes('exception') || email.body.includes('log')
      
      // 檢查附件中是否有日誌
      const logAttachments = email.attachments?.filter(att => 
        att.name.includes('log') || att.name.includes('.txt') || att.type.includes('text')
      )

      const emailContent = `
主題: ${email.subject}
內容: ${email.body}
包含日誌: ${hasLogs ? '是' : '否'}
相關附件: ${logAttachments?.map(att => att.name).join(', ') || '無'}
分類信心度: ${classification?.confidence}
關鍵指標: ${classification?.keyIndicators?.join(', ')}
`

      const prompt = `
請分析以下Jira複雜技術問題並提供專業解決方案：

${emailContent}

請提供完整的技術分析：
1. 技術問題診斷
2. 根本原因分析  
3. 分階段解決方案
4. 相關程式碼範例或配置（如適用）
5. 測試與驗證步驟
6. 長期監控與預防建議

${hasLogs ? '特別注意：此問題包含日誌資訊，請進行詳細的日誌分析。' : ''}
${logAttachments && logAttachments.length > 0 ? '請考慮附件中可能包含的錯誤資訊。' : ''}
`

      const response = await this.generateResponse(prompt)

      // 更新狀態
      let updatedState = this.addMessage(state, 'human', '正在進行深度技術分析...')
      updatedState = this.addMessage(updatedState, 'ai', response)
      updatedState = this.updateResult(
        updatedState,
        'jira_complex_resolution',
        response,
        'completed',
        {
          category: 'jira_complex',
          handlerAgent: 'jira_complex_handler',
          hasLogs,
          attachmentCount: logAttachments?.length || 0,
          technicalComplexity: 'high'
        }
      )

      return updatedState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '處理複雜問題時發生錯誤'
      return {
        ...state,
        error: errorMessage,
        result: {
          action: 'jira_complex_resolution',
          response: `技術分析失敗: ${errorMessage}`,
          status: 'failed'
        }
      }
    }
  }
}