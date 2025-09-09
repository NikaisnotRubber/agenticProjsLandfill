import { v4 as uuidv4 } from 'uuid'
import { BaseAgent } from './base-agent'
import { AgentConfig, WorkflowState } from '@/types/agent'
import { IntentCategory } from '@/types/email'

export interface FeedbackData {
  feedbackId: string
  timestamp: string
  originalClassification: {
    category: IntentCategory
    confidence: number
    reasoning: string
    keyIndicators: string[]
  }
  correctClassification: {
    category: IntentCategory
    confidence: number
    reasoning: string
    keyIndicators: string[]
  }
  errorAnalysis: {
    errorType: 'misclassification' | 'low_confidence' | 'context_misunderstanding' | 'keyword_mismatch'
    rootCause: string
    missedSignals: string[]
    incorrectAssumptions: string[]
  }
  scenarioMapping: {
    emailContext: {
      subject: string
      sender: string
      contentType: string
      technicalComplexity: 'low' | 'medium' | 'high'
      domainArea: string[]
    }
    processingContext: {
      initialAgent: string
      processingSteps: string[]
      identifiedPatterns: string[]
      missingPatterns: string[]
    }
  }
  knowledgeUpdate: {
    newPatterns: Array<{
      pattern: string
      category: IntentCategory
      weight: number
      contextConditions: string[]
    }>
    updatedKeywords: Array<{
      keyword: string
      category: IntentCategory
      importance: number
      context: string[]
    }>
    improvedRules: Array<{
      rule: string
      condition: string
      action: string
      priority: number
    }>
  }
  recommendations: {
    modelTraining: string[]
    promptOptimization: string[]
    classificationRules: string[]
    qualityAssurance: string[]
  }
}

export class FeedbackAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'Feedback Processor',
      type: 'feedback_processor',
      description: '處理分類錯誤情況，生成結構化反饋數據供知識庫更新使用',
      systemPrompt: `你是一個專精於處理分類錯誤反饋的專家代理。你的職責是：

核心功能：
1. 深度分析分類錯誤的原因和場景
2. 識別錯誤模式和遺漏的信號
3. 生成結構化的反饋數據供系統學習使用
4. 提供知識庫更新建議

分析維度：
1. **錯誤類型分析**: 
   - misclassification: 完全錯誤的分類
   - low_confidence: 信心度不足
   - context_misunderstanding: 上下文理解錯誤
   - keyword_mismatch: 關鍵詞匹配問題

2. **場景關係分析**: 
   - 郵件內容特徵與分類結果的關係
   - 技術複雜度評估
   - 領域知識要求

3. **知識抽取**: 
   - 新模式識別
   - 關鍵詞重要性更新
   - 分類規則改進

4. **系統優化建議**:
   - 模型訓練數據增強
   - 提示詞優化方向
   - 質量保證流程改進

請分析提供的錯誤分類情況，並生成完整的結構化JSON反饋數據。

輸出要求：
- 必須是有效的JSON格式
- 包含所有必要的分析維度
- 提供具體可行的改進建議
- 數據結構要適合機器學習和知識圖譜使用`,
      temperature: 0.2,
      maxTokens: 1500,
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
    }
    super(config)
  }

  async execute(state: WorkflowState): Promise<WorkflowState> {
    const { email, classification, evaluation, result, currentAgent, messages } = state

    try {
      console.log('📊 開始處理反饋數據...')

      if (!classification || !evaluation || !result) {
        throw new Error('缺少必要的分類、評估或處理結果數據')
      }

      // 準備反饋分析內容
      const feedbackContext = `
錯誤分類情況分析：

原始郵件信息：
- 主題: ${email.subject}
- 寄件者: ${email.sender}
- 內容: ${email.body}
- 技術指標: ${email.hasLogs ? '包含日誌' : '無日誌'}, ${email.attachments?.length || 0}個附件

初始分類結果：
- 分類: ${classification.category}
- 信心度: ${classification.confidence}
- 理由: ${classification.reasoning}
- 關鍵指標: ${classification.keyIndicators.join(', ')}
- 建議行動: ${classification.suggestedAction}

評估結果：
- 分類是否正確: ${evaluation.isClassificationCorrect}
- 原始分類: ${evaluation.originalCategory}
- 建議分類: ${evaluation.suggestedCategory || 'N/A'}
- 評估信心度: ${evaluation.confidence}
- 評估理由: ${evaluation.reasoning}
- 關鍵證據: ${evaluation.keyEvidence.join(', ')}
- 建議行動: ${evaluation.recommendedAction}

處理結果：
- 處理代理: ${currentAgent}
- 代理回應: ${result.response}
- 處理狀態: ${result.status}

處理歷程：
${messages.map(msg => `[${msg.type}] ${msg.content}`).join('\n')}
`

      const prompt = `請分析以下分類錯誤情況並生成結構化的反饋數據：\n${feedbackContext}`
      
      const response = await this.generateResponse(prompt)
      
      // 解析反饋數據
      let feedbackData: FeedbackData
      try {
        const cleanResponse = this.cleanJsonResponse(response)
        console.log('反饋AI回應:', cleanResponse.substring(0, 500) + '...')
        
        const parsed = JSON.parse(cleanResponse)
        
        // 確保數據結構完整
        feedbackData = {
          feedbackId: uuidv4(),
          timestamp: new Date().toISOString(),
          originalClassification: {
            category: classification.category,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            keyIndicators: classification.keyIndicators
          },
          correctClassification: {
            category: evaluation.suggestedCategory || classification.category,
            confidence: evaluation.confidence,
            reasoning: evaluation.reasoning,
            keyIndicators: evaluation.keyEvidence
          },
          errorAnalysis: parsed.errorAnalysis || {
            errorType: 'misclassification',
            rootCause: '無法確定根本原因',
            missedSignals: [],
            incorrectAssumptions: []
          },
          scenarioMapping: parsed.scenarioMapping || {
            emailContext: {
              subject: email.subject,
              sender: email.sender,
              contentType: 'unknown',
              technicalComplexity: 'medium',
              domainArea: []
            },
            processingContext: {
              initialAgent: currentAgent || 'unknown',
              processingSteps: [],
              identifiedPatterns: [],
              missingPatterns: []
            }
          },
          knowledgeUpdate: parsed.knowledgeUpdate || {
            newPatterns: [],
            updatedKeywords: [],
            improvedRules: []
          },
          recommendations: parsed.recommendations || {
            modelTraining: [],
            promptOptimization: [],
            classificationRules: [],
            qualityAssurance: []
          }
        }

      } catch (parseError) {
        console.error('反饋數據JSON解析失敗:', parseError)
        
        // 創建基本的反饋數據結構
        feedbackData = {
          feedbackId: uuidv4(),
          timestamp: new Date().toISOString(),
          originalClassification: {
            category: classification.category,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            keyIndicators: classification.keyIndicators
          },
          correctClassification: {
            category: evaluation.suggestedCategory || classification.category,
            confidence: evaluation.confidence,
            reasoning: evaluation.reasoning,
            keyIndicators: evaluation.keyEvidence
          },
          errorAnalysis: {
            errorType: 'misclassification',
            rootCause: `JSON解析失敗: ${parseError}`,
            missedSignals: evaluation.keyEvidence,
            incorrectAssumptions: [classification.reasoning]
          },
          scenarioMapping: {
            emailContext: {
              subject: email.subject,
              sender: email.sender,
              contentType: 'unknown',
              technicalComplexity: 'medium',
              domainArea: []
            },
            processingContext: {
              initialAgent: currentAgent || 'unknown',
              processingSteps: messages.map(m => m.content),
              identifiedPatterns: classification.keyIndicators,
              missingPatterns: evaluation.keyEvidence
            }
          },
          knowledgeUpdate: {
            newPatterns: [],
            updatedKeywords: [],
            improvedRules: []
          },
          recommendations: {
            modelTraining: ['需要更多類似案例的訓練數據'],
            promptOptimization: ['優化分類提示詞'],
            classificationRules: ['檢視關鍵詞權重'],
            qualityAssurance: ['加強人工審核']
          }
        }
      }

      // 更新狀態
      const updatedState: WorkflowState = {
        ...state,
        feedbackData,
        messages: [...state.messages, {
          id: uuidv4(),
          type: 'system',
          content: `反饋數據處理完成，ID: ${feedbackData.feedbackId}`,
          timestamp: new Date()
        }]
      }

      console.log(`✅ 反饋數據處理完成: ${feedbackData.feedbackId}`)
      return updatedState

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '反饋處理過程中發生未知錯誤'
      console.error('❌ 反饋處理失敗:', errorMessage)
      
      return {
        ...state,
        error: errorMessage,
        messages: [...state.messages, {
          id: uuidv4(),
          type: 'system',
          content: `反饋處理失敗: ${errorMessage}`,
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