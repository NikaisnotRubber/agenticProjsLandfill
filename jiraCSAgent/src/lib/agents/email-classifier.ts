import { v4 as uuidv4 } from 'uuid'
import { BaseAgent } from './base-agent'
import { AgentConfig, WorkflowState } from '@/types/agent'
import { ClassificationResult, IntentCategory } from '@/types/email'

export class EmailClassifierAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Email Classifier',
      type: 'email_classifier',
      description: '分析郵件內容並分類為三個場景之一',
      systemPrompt: `你是一個專業的郵件分類代理，負責分析郵件內容並將其分類到以下三個場景之一：

場景分類：
1. jira_simple - Jira簡單問題：
   - 登入問題
   - 欄位設定問題
   - Confluence聯動或設定問題
   - 基本操作問題

2. jira_complex - Jira複雜問題：
   - Script Runner相關問題（特別重要的指標）
   - 外部系統交互問題
   - 郵件內容包含log資訊的問題
   - 技術性故障或錯誤

3. general - 其他情況：
   - 不屬於上述兩個場景的所有其他問題

分析指標：
- 關鍵詞匹配：script runner, log, error, 外部系統, API, 整合
- 技術複雜度：是否涉及程式碼、腳本、系統整合
- 問題類型：設定問題 vs 技術問題
- 是否包含錯誤日誌或異常資訊

請只回應純JSON格式，不要包含任何其他文字、說明或markdown標記。必須包含：
- category: 分類結果 ("jira_simple" | "jira_complex" | "general")
- confidence: 信心度 (0-1 之間的數字)
- reasoning: 分類理由 (字串)
- keyIndicators: 關鍵指標陣列 (字串陣列)
- suggestedAction: 建議處理方式 (字串)

範例格式：
{
  "category": "jira_simple",
  "confidence": 0.8,
  "reasoning": "郵件提到登入問題",
  "keyIndicators": ["登入", "密碼"],
  "suggestedAction": "提供登入指導"
}`,
      temperature: 0.1,
      maxTokens: 600,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    super(config)
  }

  async execute(state: WorkflowState): Promise<WorkflowState> {
    const { email } = state

    try {
      // 準備郵件內容用於分析
      const emailContext = `
主題: ${email.subject}
寄件者: ${email.sender}
內容: ${email.body}
是否有附件: ${email.attachments && email.attachments.length > 0 ? '是' : '否'}
${email.hasLogs ? '包含日誌資訊' : ''}
`

      const prompt = `請分析以下郵件並進行分類：\n${emailContext}`
      
      // Test direct OpenAI service integration
      const response = await this.generateResponseDirect(prompt)
      
      // 解析AI回應
      let classificationResult: ClassificationResult
      try {
        // 清理回應，移除可能的markdown格式和多餘的文字
        let cleanResponse = response.trim()
        
        // 尋找JSON開始和結束的位置
        const jsonStart = cleanResponse.indexOf('{')
        const jsonEnd = cleanResponse.lastIndexOf('}')
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
        }
        
        // 移除可能的markdown代碼塊標記
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
        
        console.log('AI原始回應:', response)
        console.log('清理後的JSON:', cleanResponse)
        
        const parsed = JSON.parse(cleanResponse)
        classificationResult = {
          category: parsed.category as IntentCategory,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning,
          keyIndicators: parsed.keyIndicators || [],
          suggestedAction: parsed.suggestedAction
        }
      } catch (parseError) {
        console.error('JSON解析失敗:', parseError)
        console.error('原始回應:', response)
        
        // 如果JSON解析失敗，提供默認分類
        classificationResult = {
          category: 'general',
          confidence: 0.5,
          reasoning: `AI回應格式錯誤，使用默認分類。原始回應: ${response.substring(0, 200)}...`,
          keyIndicators: [],
          suggestedAction: '需要人工審核'
        }
      }

      // 更新狀態
      let updatedState = this.addMessage(state, 'ai', `郵件已分類為: ${classificationResult.category}`)
      updatedState = {
        ...updatedState,
        classification: classificationResult,
        currentAgent: 'email_classifier'
      }

      return updatedState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '分類過程中發生未知錯誤'
      return {
        ...state,
        error: errorMessage,
        messages: [...state.messages, {
          id: uuidv4(),
          type: 'system',
          content: `郵件分類失敗: ${errorMessage}`,
          timestamp: new Date()
        }]
      }
    }
  }
}