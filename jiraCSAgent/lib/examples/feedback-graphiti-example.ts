/**
 * Feedback Graphiti Integration Example
 * 反饋數據與Graphiti整合的使用示例
 */

import { FeedbackAgent, FeedbackData } from '@/lib/agents/feedback-agent'
import { FeedbackRAGService, FeedbackRAGQuery } from '@/lib/services/feedback-rag-service'
import { createGraphitiClient } from '@/lib/integrations/graphiti-client'
import { IntentCategory } from '@/types/email'
import { WorkflowState } from '@/types/agent'
import { v4 as uuidv4 } from 'uuid'

/**
 * 示例：初始化Graphiti整合服務
 */
async function initializeGraphitiServices() {
  console.log('🚀 初始化Graphiti整合服務...')
  
  // 創建Graphiti客戶端
  const graphitiClient = createGraphitiClient({
    neo4j_uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j_user: process.env.NEO4J_USER || 'neo4j',
    neo4j_password: process.env.NEO4J_PASSWORD || 'test1234'
  })
  
  // 初始化客戶端連接
  const isConnected = await graphitiClient.initialize()
  
  if (!isConnected) {
    throw new Error('無法連接到Graphiti服務')
  }
  
  // 建立索引和約束
  await graphitiClient.build_indices_and_constraints()
  
  console.log('✅ Graphiti服務初始化完成')
  
  return {
    graphitiClient,
    feedbackRAGService: new FeedbackRAGService(graphitiClient)
  }
}

/**
 * 示例：模擬分類錯誤和反饋處理
 */
async function simulateClassificationFeedback() {
  console.log('📝 模擬分類錯誤和反饋處理...')
  
  const feedbackAgent = new FeedbackAgent()
  
  // 模擬工作流狀態
  const mockWorkflowState: WorkflowState = {
    id: uuidv4(),
    email: {
      id: 'email-001',
      subject: 'Server connection timeout issue in production',
      sender: 'admin@company.com',
      body: 'We are experiencing timeout issues when connecting to the database server. The error occurs randomly and affects multiple users. Please investigate urgently.',
      timestamp: new Date(),
      hasLogs: true,
      attachments: ['error.log']
    },
    classification: {
      category: IntentCategory.GENERAL_INQUIRY, // 錯誤分類
      confidence: 0.65,
      reasoning: '郵件包含一般性問題描述',
      keyIndicators: ['issue', 'investigate'],
      suggestedAction: '轉發給一般支援團隊'
    },
    evaluation: {
      isClassificationCorrect: false,
      originalCategory: IntentCategory.GENERAL_INQUIRY,
      suggestedCategory: IntentCategory.TECHNICAL_SUPPORT, // 正確分類
      confidence: 0.9,
      reasoning: '郵件明確描述技術問題：服務器連接超時，需要技術支援',
      keyEvidence: ['server', 'timeout', 'database', 'error', 'production'],
      recommendedAction: '立即轉發給技術支援團隊處理'
    },
    result: {
      response: '已將此問題轉發給技術支援團隊進行緊急處理',
      status: 'resolved'
    },
    currentAgent: 'classification-agent',
    messages: [
      {
        id: uuidv4(),
        type: 'system',
        content: '分類處理開始',
        timestamp: new Date()
      }
    ]
  }
  
  // 執行反饋處理
  const updatedState = await feedbackAgent.execute(mockWorkflowState)
  
  console.log('✅ 反饋處理完成')
  console.log('反饋數據ID:', updatedState.feedbackData?.feedbackId)
  
  return updatedState.feedbackData
}

/**
 * 示例：使用RAG服務查詢反饋洞察
 */
async function demonstrateRAGQueries(ragService: FeedbackRAGService) {
  console.log('🔍 展示RAG查詢功能...')
  
  // 查詢1: 技術支援相關的分類錯誤
  const techSupportQuery: FeedbackRAGQuery = {
    query: '技術支援分類錯誤模式分析',
    category: IntentCategory.TECHNICAL_SUPPORT,
    maxResults: 10
  }
  
  const techSupportResult = await ragService.queryFeedbackInsights(techSupportQuery)
  
  console.log('🔧 技術支援分類錯誤查詢結果:')
  console.log(`- 找到 ${techSupportResult.totalRelevantCases} 個相關案例`)
  console.log(`- 信心度: ${(techSupportResult.confidence * 100).toFixed(1)}%`)
  console.log(`- 改進建議: ${techSupportResult.improvementSuggestions.length} 項`)
  
  // 查詢2: 低信心度分類案例
  const lowConfidenceResult = await ragService.analyzeLowConfidenceCases(0.7)
  
  console.log('📊 低信心度分類分析:')
  console.log(`- 找到 ${lowConfidenceResult.totalRelevantCases} 個低信心度案例`)
  console.log('- 常見錯誤類型:')
  lowConfidenceResult.patternAnalysis.commonErrorTypes.forEach(error => {
    console.log(`  * ${error.type}: ${error.frequency}次 (${error.percentage}%)`)
  })
  
  // 查詢3: 特定錯誤類型的模式
  const errorPatterns = await ragService.getErrorTypePatterns('misclassification', 15)
  
  console.log('🎯 錯誤分類模式分析:')
  console.log(`- 找到 ${errorPatterns.length} 個錯誤分類案例`)
  
  errorPatterns.slice(0, 3).forEach((pattern, index) => {
    console.log(`  ${index + 1}. ${pattern.originalCategory} → ${pattern.correctCategory}`)
    console.log(`     根本原因: ${pattern.rootCause}`)
    console.log(`     遺漏信號: ${pattern.missedSignals.join(', ')}`)
  })
  
  // 查詢4: 分類改進建議
  const improvements = await ragService.getClassificationImprovements(
    IntentCategory.GENERAL_INQUIRY,
    IntentCategory.TECHNICAL_SUPPORT,
    'server timeout database error'
  )
  
  console.log('💡 分類改進建議:')
  improvements.forEach((suggestion, index) => {
    console.log(`  ${index + 1}. ${suggestion}`)
  })
  
  return {
    techSupportResult,
    lowConfidenceResult,
    errorPatterns,
    improvements
  }
}

/**
 * 示例：生成反饋報告
 */
async function generateFeedbackReport(ragService: FeedbackRAGService) {
  console.log('📋 生成反饋分析報告...')
  
  const reportQuery: FeedbackRAGQuery = {
    query: '全面反饋分析報告',
    maxResults: 50
  }
  
  const reportResult = await ragService.queryFeedbackInsights(reportQuery)
  
  console.log('=' .repeat(60))
  console.log('反饋分析報告')
  console.log('=' .repeat(60))
  
  console.log(`\n📊 總體統計:`)
  console.log(`- 總反饋案例數: ${reportResult.totalRelevantCases}`)
  console.log(`- 數據完整度信心度: ${(reportResult.confidence * 100).toFixed(1)}%`)
  
  console.log(`\n🔍 錯誤類型分布:`)
  reportResult.patternAnalysis.commonErrorTypes.forEach(error => {
    console.log(`- ${error.type}: ${error.frequency}次 (${error.percentage}%)`)
  })
  
  console.log(`\n⚠️ 最常遺漏的信號 (前5名):`)
  reportResult.patternAnalysis.frequentMissedSignals.slice(0, 5).forEach((signal, index) => {
    console.log(`${index + 1}. "${signal.signal}" - 出現${signal.frequency}次`)
    console.log(`   涉及分類: ${signal.categories.join(', ')}`)
  })
  
  console.log(`\n💡 高頻改進建議 (前5名):`)
  reportResult.patternAnalysis.recommendationPatterns.slice(0, 5).forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.recommendation} (${rec.frequency}次)`)
  })
  
  console.log(`\n🔄 分類混淆矩陣 (前5名):`)
  reportResult.patternAnalysis.categoryConfusionMatrix.slice(0, 5).forEach((confusion, index) => {
    console.log(`${index + 1}. ${confusion.from} → ${confusion.to}: ${confusion.frequency}次`)
  })
  
  console.log(`\n🎯 關鍵改進建議:`)
  reportResult.improvementSuggestions.slice(0, 8).forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion}`)
  })
  
  console.log('=' .repeat(60))
  
  return reportResult
}

/**
 * 主函數：運行完整示例
 */
export async function runFeedbackGraphitiExample() {
  try {
    console.log('🚀 開始Feedback Graphiti整合示例...')
    
    // 1. 初始化服務
    const { graphitiClient, feedbackRAGService } = await initializeGraphitiServices()
    
    // 2. 模擬反饋處理
    const feedbackData = await simulateClassificationFeedback()
    
    // 等待一下讓數據在圖譜中處理完成
    console.log('⏳ 等待數據在知識圖譜中處理...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 3. 展示RAG查詢
    const queryResults = await demonstrateRAGQueries(feedbackRAGService)
    
    // 4. 生成報告
    const report = await generateFeedbackReport(feedbackRAGService)
    
    console.log('✅ Feedback Graphiti整合示例完成!')
    
    return {
      feedbackData,
      queryResults,
      report
    }
    
  } catch (error) {
    console.error('❌ 示例運行失敗:', error)
    throw error
  }
}

/**
 * 開發測試函數
 */
export async function testFeedbackGraphitiIntegration() {
  console.log('🧪 測試Feedback Graphiti整合...')
  
  try {
    const result = await runFeedbackGraphitiExample()
    
    console.log('🎉 所有測試通過!')
    return result
    
  } catch (error) {
    console.error('❌ 測試失敗:', error)
    process.exit(1)
  }
}

// 如果直接運行此文件，執行測試
if (require.main === module) {
  testFeedbackGraphitiIntegration()
}