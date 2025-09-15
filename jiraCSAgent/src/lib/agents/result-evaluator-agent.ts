import { v4 as uuidv4 } from 'uuid'
import { BaseAgent } from './base-agent'
import { AgentConfig, WorkflowState } from '@/types/agent'
import { IntentCategory } from '@/types/email'

export interface EvaluationResult {
  isClassificationCorrect: boolean
  originalCategory: IntentCategory
  suggestedCategory?: IntentCategory
  confidence: number
  reasoning: string
  keyEvidence: string[]
  recommendedAction: 'accept' | 'reclassify' | 'human_review'
}

export class ResultEvaluatorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Result Evaluator',
      type: 'result_evaluator',
      description: '評估處理結果的質量，判斷初始分類是否正確',
      systemPrompt: `你是一個專精於評估郵件分類和處理結果的專家代理。你的職責是：

核心功能：
1. 評估初始分類的準確性
2. 判斷處理結果是否與郵件內容匹配
3. 識別可能的分類錯誤並建議正確分類

評估標準：
1. **內容一致性**: 處理結果是否符合郵件的實際問題
2. **技術複雜度**: 是否正確識別了技術複雜程度
3. **關鍵詞匹配**: 重要關鍵詞是否被正確識別
4. **上下文理解**: 是否理解了問題的真正含義

分類標準：
- jira_simple: 登入、基本設定、一般操作問題
- jira_complex: Script Runner、log分析、系統整合、技術故障
- general: 非Jira相關或一般性詢問

判斷邏輯：
1. 如果處理結果明顯與郵件內容不符 → reclassify
2. 如果處理結果質量低但分類可能正確 → human_review  
3. 如果處理結果合理且分類正確 → accept

請只回應純JSON格式，包含：
- isClassificationCorrect: boolean
- originalCategory: 原始分類
- suggestedCategory: 建議分類 (如果需要重新分類)
- confidence: 評估信心度 (0-1)
- reasoning: 評估理由
- keyEvidence: 關鍵證據陣列
- recommendedAction: "accept" | "reclassify" | "human_review"

範例：
{
  "isClassificationCorrect": false,
  "originalCategory": "jira_simple",
  "suggestedCategory": "jira_complex",
  "confidence": 0.85,
  "reasoning": "郵件提到Script Runner錯誤和groovy腳本問題，明顯屬於複雜技術問題",
  "keyEvidence": ["Script Runner", "groovy script", "execution failed"],
  "recommendedAction": "reclassify"
}`,
      temperature: 0.1,
      maxTokens: 1024,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    super(config)
  }

  async execute(state: WorkflowState): Promise<WorkflowState> {
    const { email, classification, result, currentAgent } = state

    try {
      console.log('🔍 開始結果評估...')

      if (!classification || !result) {
        throw new Error('缺少分類結果或處理結果')
      }

      // 準備評估內容
      const evaluationContext = `
原始郵件：
主題: ${email.subject}
寄件者: ${email.sender}
內容: ${email.body}
是否有附件: ${email.attachments && email.attachments.length > 0 ? '是' : '否'}
是否有日誌: ${email.hasLogs ? '是' : '否'}

初始分類結果：
分類: ${classification.category}
信心度: ${classification.confidence}
分類理由: ${classification.reasoning}
關鍵指標: ${classification.keyIndicators.join(', ')}

處理結果：
處理代理: ${currentAgent}
建議行動: ${classification.suggestedAction}
代理回應: ${result.response}
處理狀態: ${result.status}
`

      const prompt = `請評估以下郵件的分類和處理結果是否正確：\n${evaluationContext}`
      
      const response = await this.generateResponse(prompt)
      
      // 解析評估結果
      let evaluationResult: EvaluationResult
      try {
        const cleanResponse = this.cleanJsonResponse(response)
        console.log('評估AI回應:', cleanResponse)
        
        const parsed = JSON.parse(cleanResponse)
        evaluationResult = {
          isClassificationCorrect: parsed.isClassificationCorrect,
          originalCategory: parsed.originalCategory,
          suggestedCategory: parsed.suggestedCategory,
          confidence: parsed.confidence,
          reasoning: parsed.reasoning,
          keyEvidence: parsed.keyEvidence || [],
          recommendedAction: parsed.recommendedAction
        }
      } catch (parseError) {
        console.error('評估結果JSON解析失敗:', parseError)
        // 提供保守的默認評估
        evaluationResult = {
          isClassificationCorrect: true, // 保守假設分類正確
          originalCategory: classification.category,
          confidence: 0.5,
          reasoning: `評估過程出錯，保持原分類。解析錯誤: ${parseError}`,
          keyEvidence: [],
          recommendedAction: 'accept'
        }
      }

      // 更新狀態
      const updatedState: WorkflowState = {
        ...state,
        evaluation: evaluationResult,
        messages: [...state.messages, {
          id: uuidv4(),
          type: 'ai',
          content: `評估完成: ${evaluationResult.recommendedAction} (信心度: ${evaluationResult.confidence})`,
          timestamp: new Date()
        }]
      }

      console.log(`✅ 結果評估完成: ${evaluationResult.recommendedAction}`)
      return updatedState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '評估過程中發生未知錯誤'
      console.error('❌ 結果評估失敗:', errorMessage)
      
      return {
        ...state,
        error: errorMessage,
        messages: [...state.messages, {
          id: uuidv4(),
          type: 'system',
          content: `結果評估失敗: ${errorMessage}`,
          timestamp: new Date()
        }]
      }
    }
  }

  private cleanJsonResponse(response: string): string {
    let cleanResponse = response.trim()
    
    // 尋找JSON開始和結束的位置
    const jsonStart = cleanResponse.indexOf('{')
    const jsonEnd = cleanResponse.lastIndexOf('}')
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1)
    }
    
    // 移除可能的markdown代碼塊標記
    cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '')
    
    return cleanResponse
  }
}