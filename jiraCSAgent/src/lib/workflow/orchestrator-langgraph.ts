import { WorkflowState } from '@/types/agent'
import { EmailClassifierAgent } from '../agents/email-classifier'
import { JiraSimpleHandlerAgent } from '../agents/jira-simple-handler'
import { JiraComplexHandlerAgent } from '../agents/jira-complex-handler'
import { GeneralHandlerAgent } from '../agents/general-handler'
import { ResultEvaluatorAgent } from '../agents/result-evaluator-agent'
import { FeedbackAgent } from '../agents/feedback-agent'

// 簡化的 LangGraph 風格實現，但不依賴複雜的類型定義
export class LangGraphStyleEmailWorkflowOrchestrator {
  private emailClassifier: EmailClassifierAgent
  private jiraSimpleHandler: JiraSimpleHandlerAgent
  private jiraComplexHandler: JiraComplexHandlerAgent
  private generalHandler: GeneralHandlerAgent
  private resultEvaluator: ResultEvaluatorAgent
  private feedbackAgent: FeedbackAgent
  
  // 工作流程節點映射
  private nodes: Map<string, (state: WorkflowState) => Promise<WorkflowState>> = new Map()
  private edges: Map<string, string> = new Map()
  private conditionalEdges: Map<string, {
    condition: (state: WorkflowState) => string,
    mapping: Record<string, string>
  }> = new Map()

  constructor() {
    // 初始化所有代理
    this.emailClassifier = new EmailClassifierAgent()
    this.jiraSimpleHandler = new JiraSimpleHandlerAgent()
    this.jiraComplexHandler = new JiraComplexHandlerAgent()
    this.generalHandler = new GeneralHandlerAgent()
    this.resultEvaluator = new ResultEvaluatorAgent()
    this.feedbackAgent = new FeedbackAgent()

    this.setupWorkflow()
  }

  private setupWorkflow() {
    console.log('設置優化後的LangGraph風格工作流程...')
    
    // 添加節點
    this.addNode('START', async (state) => {
      console.log('🚀 工作流程開始')
      return state
    })
    
    // 分類和處理節點
    this.addNode('classify_email', this.classifyEmail.bind(this))
    this.addNode('handle_jira_simple', this.handleJiraSimple.bind(this))
    this.addNode('handle_jira_complex', this.handleJiraComplex.bind(this))
    this.addNode('handle_general', this.handleGeneral.bind(this))
    
    // 新增的評估和反饋節點
    this.addNode('evaluate_result', this.evaluateResult.bind(this))
    this.addNode('reclassify_email', this.reclassifyEmail.bind(this))
    this.addNode('process_feedback', this.processFeedback.bind(this))
    
    this.addNode('END', async (state) => {
      console.log('✅ 工作流程結束')
      return state
    })

    // 設置基本邊
    this.addEdge('START', 'classify_email')
    
    // 第一次分類後的路由
    this.addConditionalEdges(
      'classify_email',
      (state: WorkflowState) => this.routeToHandler(state),
      {
        'jira_simple': 'handle_jira_simple',
        'jira_complex': 'handle_jira_complex',
        'general': 'handle_general'
      }
    )

    // 所有處理節點都連接到評估節點
    this.addEdge('handle_jira_simple', 'evaluate_result')
    this.addEdge('handle_jira_complex', 'evaluate_result')
    this.addEdge('handle_general', 'evaluate_result')
    
    // 評估節點的條件路由
    this.addConditionalEdges(
      'evaluate_result',
      (state: WorkflowState) => this.routeAfterEvaluation(state),
      {
        'accept': 'END',
        'process_feedback': 'process_feedback',
        'human_review': 'END'
      }
    )
    
    // 反饋處理連接直接到結束
    this.addEdge('process_feedback', 'END')
    
    console.log('🔧 優化後的工作流程設置完成')
  }

  // 添加節點
  private addNode(name: string, func: (state: WorkflowState) => Promise<WorkflowState>) {
    this.nodes.set(name, func)
    console.log(`添加節點: ${name}`)
  }

  // 添加邊
  private addEdge(from: string, to: string) {
    this.edges.set(from, to)
    console.log(`添加邊: ${from} -> ${to}`)
  }

  // 添加條件邊
  private addConditionalEdges(
    from: string,
    condition: (state: WorkflowState) => string,
    mapping: Record<string, string>
  ) {
    this.conditionalEdges.set(from, { condition, mapping })
    console.log(`添加條件邊: ${from} -> [${Object.keys(mapping).join(', ')}]`)
  }

  // 郵件分類節點
  private async classifyEmail(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('📧 開始郵件分類...')
      const updatedState = await this.emailClassifier.execute(state)
      console.log(`✅ 郵件分類完成: ${updatedState.classification?.category} (信心度: ${updatedState.classification?.confidence})`)
      return updatedState
    } catch (error: unknown) {
      console.error('❌ 郵件分類失敗:', error)
      return {
        ...state,
        error: {
          message: `分類失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'email_classifier',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 路由邏輯
  private routeToHandler(state: WorkflowState): string {
    if (!state.classification) {
      console.log('⚠️ 沒有分類結果，路由到一般處理器')
      return 'general'
    }

    const { category, confidence } = state.classification

    if (confidence < 0.6) {
      console.warn(`⚠️ 分類信心度較低 (${confidence})，路由到一般處理器`)
      return 'general'
    }

    console.log(`🎯 根據分類結果路由到 ${category} 處理器 (信心度: ${confidence})`)
    return category
  }

  // Jira簡單問題處理節點
  private async handleJiraSimple(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('🔧 開始處理Jira簡單問題...')
      const result = await this.jiraSimpleHandler.execute(state)
      console.log('✅ Jira簡單問題處理完成')
      return result
    } catch (error: unknown) {
      console.error('❌ Jira簡單問題處理失敗:', error)
      return {
        ...state,
        error: {
          message: `Jira簡單問題處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'jira_simple_handler',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // Jira複雜問題處理節點
  private async handleJiraComplex(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('⚙️ 開始處理Jira複雜問題...')
      const result = await this.jiraComplexHandler.execute(state)
      console.log('✅ Jira複雜問題處理完成')
      return result
    } catch (error: unknown) {
      console.error('❌ Jira複雜問題處理失敗:', error)
      return {
        ...state,
        error: {
          message: `Jira複雜問題處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'jira_complex_handler',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 一般問題處理節點
  private async handleGeneral(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('📝 開始處理一般問題...')
      const result = await this.generalHandler.execute(state)
      console.log('✅ 一般問題處理完成')
      return result
    } catch (error: unknown) {
      console.error('❌ 一般問題處理失敗:', error)
      return {
        ...state,
        error: {
          message: `一般問題處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'general_handler',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 結果評估節點
  private async evaluateResult(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('🔍 開始評估處理結果...')
      const evaluatedState = await this.resultEvaluator.execute(state)
      console.log(`✅ 結果評估完成: ${evaluatedState.evaluation?.recommendedAction}`)
      return evaluatedState
    } catch (error: unknown) {
      console.error('❌ 結果評估失敗:', error)
      return {
        ...state,
        error: {
          message: `結果評估失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'result_evaluator',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 評估後的路由邏輯
  private routeAfterEvaluation(state: WorkflowState): string {
    if (!state.evaluation) {
      console.log('⚠️ 沒有評估結果，直接接受')
      return 'accept'
    }

    const { recommendedAction, isClassificationCorrect } = state.evaluation

    console.log(`🎯 評估建議: ${recommendedAction} (分類正確: ${isClassificationCorrect})`)

    // 如果需要重新分類，路由到反饋處理節點
    if (recommendedAction === 'reclassify') {
      console.log('🔄 將進行反饋處理和重新分類')
      return 'process_feedback'
    }

    return recommendedAction
  }

  // 重新分類郵件節點
  private async reclassifyEmail(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('🔄 開始重新分類郵件...')
      
      if (!state.evaluation?.suggestedCategory) {
        throw new Error('缺少建議的分類結果')
      }

      // 更新分類結果為建議的分類
      const reclassifiedState: WorkflowState = {
        ...state,
        classification: {
          category: state.evaluation.suggestedCategory,
          confidence: state.evaluation.confidence,
          reasoning: `重新分類: ${state.evaluation.reasoning}`,
          keyIndicators: state.evaluation.keyEvidence,
          suggestedAction: `基於評估結果的重新分類處理`
        },
        currentAgent: 'result_evaluator'
      }

      console.log(`✅ 重新分類完成: ${state.evaluation.suggestedCategory}`)
      return reclassifiedState

    } catch (error: unknown) {
      console.error('❌ 重新分類失敗:', error)
      return {
        ...state,
        error: {
          message: `重新分類失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'reclassify_email',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 重新分類後的路由邏輯
  private routeToCorrectHandler(state: WorkflowState): string {
    if (!state.classification || !state.evaluation) {
      console.log('⚠️ 缺少分類或評估結果，使用一般處理器')
      return 'general'
    }

    const category = state.evaluation.suggestedCategory || state.classification.category
    console.log(`🎯 路由到正確的處理器: ${category}`)
    
    return category
  }

  // 反饋處理節點
  private async processFeedback(state: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('📊 開始處理反饋數據...')
      const feedbackState = await this.feedbackAgent.execute(state)
      console.log(`✅ 反饋處理完成: ${feedbackState.feedbackData?.feedbackId}`)
      
      // 如果評估建議重新分類，現在執行重新分類
      if (state.evaluation?.recommendedAction === 'reclassify') {
        console.log('🔄 執行重新分類流程...')
        const reclassifiedState = await this.reclassifyEmail(feedbackState)
        
        // 根據重新分類的結果路由到正確的處理器
        const correctCategory = reclassifiedState.evaluation?.suggestedCategory || reclassifiedState.classification?.category
        if (correctCategory) {
          console.log(`🎯 將使用 ${correctCategory} 處理器重新處理`)
          
          // 根據正確的分類選擇處理器
          let correctedResult: WorkflowState
          switch (correctCategory) {
            case 'jira_simple':
              correctedResult = await this.handleJiraSimple(reclassifiedState)
              break
            case 'jira_complex':
              correctedResult = await this.handleJiraComplex(reclassifiedState)
              break
            case 'general':
              correctedResult = await this.handleGeneral(reclassifiedState)
              break
            default:
              correctedResult = await this.handleGeneral(reclassifiedState)
          }
          
          console.log('✅ 重新處理完成')
          return correctedResult
        }
      }
      
      return feedbackState
    } catch (error: unknown) {
      console.error('❌ 反饋處理失敗:', error)
      return {
        ...state,
        error: {
          message: `反饋處理失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'feedback_processor',
          timestamp: new Date().toISOString()
        }
      }
    }
  }

  // 執行工作流程
  async processEmail(initialState: WorkflowState): Promise<WorkflowState> {
    try {
      console.log('🚀 開始LangGraph風格工作流程執行...')
      console.log(`📧 處理郵件: "${initialState.email.subject}" (來自: ${initialState.email.sender})`)
      
      let currentState = initialState
      let currentNode = 'START'
      const visitedNodes: string[] = []
      const maxSteps = 10 // 防止無限循環

      for (let step = 0; step < maxSteps; step++) {
        if (currentNode === 'END') {
          break
        }

        visitedNodes.push(currentNode)
        console.log(`📍 執行節點: ${currentNode} (步驟 ${step + 1})`)

        // 執行當前節點
        const nodeFunc = this.nodes.get(currentNode)
        if (!nodeFunc) {
          throw new Error(`找不到節點: ${currentNode}`)
        }

        currentState = await nodeFunc(currentState)

        // 檢查是否有錯誤
        if (currentState.error && currentNode !== 'START' && currentNode !== 'END') {
          console.error(`❌ 節點 ${currentNode} 發生錯誤:`, currentState.error)
          break
        }

        // 決定下一個節點
        const conditionalEdge = this.conditionalEdges.get(currentNode)
        if (conditionalEdge) {
          const conditionResult = conditionalEdge.condition(currentState)
          currentNode = conditionalEdge.mapping[conditionResult]
          if (!currentNode) {
            throw new Error(`條件 '${conditionResult}' 沒有對應的路由`)
          }
          console.log(`🔀 條件路由: ${conditionResult} -> ${currentNode}`)
        } else {
          const nextNode = this.edges.get(currentNode)
          if (nextNode) {
            currentNode = nextNode
            console.log(`➡️ 直接路由: -> ${currentNode}`)
          } else if (currentNode !== 'END') {
            currentNode = 'END'
            console.log(`🏁 自動路由到結束`)
          }
        }
      }

      console.log('✅ LangGraph風格工作流程執行完成')
      console.log(`🛣️ 訪問路徑: ${visitedNodes.join(' -> ')} -> END`)
      
      return currentState

    } catch (error: unknown) {
      console.error('💥 LangGraph風格工作流程執行失敗:', error)
      return {
        ...initialState,
        error: {
          message: `工作流程執行失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
          source: 'orchestrator',
          timestamp: new Date().toISOString()
        },
        result: {
          action: 'workflow_error',
          response: '工作流程執行過程中發生錯誤',
          status: 'failed'
        }
      }
    }
  }

  // 獲取工作流程統計
  getWorkflowStats(state: WorkflowState) {
    return {
      totalMessages: state.messages.length,
      classification: state.classification,
      currentAgent: state.currentAgent,
      hasError: !!state.error,
      isCompleted: state.result?.status === 'completed',
      processingTime: state.messages.length > 0 
        ? new Date().getTime() - new Date(state.messages[0].timestamp).getTime()
        : 0,
      graphStats: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.size,
        conditionalEdges: this.conditionalEdges.size
      }
    }
  }

  // 獲取工作流程圖結構
  getGraphStructure() {
    return {
      nodes: Array.from(this.nodes.keys()),
      edges: Array.from(this.edges.entries()).map(([from, to]) => ({ from, to })),
      conditionalEdges: Array.from(this.conditionalEdges.entries()).map(([from, config]) => ({
        from,
        conditions: Object.keys(config.mapping),
        targets: Object.values(config.mapping)
      }))
    }
  }

  // 驗證工作流程結構
  validateGraph(): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    // 檢查所有邊的目標節點是否存在
    for (const [from, to] of this.edges) {
      if (!this.nodes.has(to)) {
        errors.push(`邊 ${from} -> ${to}: 目標節點 '${to}' 不存在`)
      }
    }
    
    // 檢查條件邊的目標節點
    for (const [from, config] of this.conditionalEdges) {
      for (const [condition, to] of Object.entries(config.mapping)) {
        if (!this.nodes.has(to)) {
          errors.push(`條件邊 ${from} [${condition}] -> ${to}: 目標節點 '${to}' 不存在`)
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}