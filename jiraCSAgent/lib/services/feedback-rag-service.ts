/**
 * Feedback RAG Service
 * 基於Graphiti知識圖譜的反饋檢索增強生成服務
 * Retrieval-Augmented Generation service for feedback data stored in Graphiti knowledge graph
 */

import { FeedbackGraphitiService } from './feedback-graphiti-service'
import { GraphitiClient } from '@/lib/integrations/graphiti-client'
import { IntentCategory } from '@/types/email'

export interface FeedbackRAGQuery {
  query: string
  category?: IntentCategory
  errorType?: string
  technicalComplexity?: 'low' | 'medium' | 'high'
  maxResults?: number
}

export interface FeedbackRAGResult {
  success: boolean
  query: string
  relevantFeedback: FeedbackInsight[]
  improvementSuggestions: string[]
  patternAnalysis: PatternAnalysis
  totalRelevantCases: number
  confidence: number
}

export interface FeedbackInsight {
  feedbackId: string
  errorType: string
  originalCategory: string
  correctCategory: string
  rootCause: string
  missedSignals: string[]
  recommendedActions: string[]
  similarity: number
  timestamp: string
}

export interface PatternAnalysis {
  commonErrorTypes: Array<{
    type: string
    frequency: number
    percentage: number
  }>
  frequentMissedSignals: Array<{
    signal: string
    frequency: number
    categories: string[]
  }>
  recommendationPatterns: Array<{
    recommendation: string
    frequency: number
    contexts: string[]
  }>
  categoryConfusionMatrix: Array<{
    from: string
    to: string
    frequency: number
  }>
}

export class FeedbackRAGService {
  private graphitiService: FeedbackGraphitiService
  private graphitiClient: GraphitiClient

  constructor(graphitiClient: GraphitiClient) {
    this.graphitiClient = graphitiClient
    this.graphitiService = new FeedbackGraphitiService(graphitiClient)
  }

  /**
   * 執行反饋數據的RAG查詢
   */
  async queryFeedbackInsights(ragQuery: FeedbackRAGQuery): Promise<FeedbackRAGResult> {
    try {
      console.log(`🔍 執行反饋RAG查詢: ${ragQuery.query}`)
      
      // 1. 建構增強查詢
      const enhancedQuery = this.buildEnhancedQuery(ragQuery)
      
      // 2. 搜索相關的反饋episodes
      const searchResults = await this.searchRelevantFeedback(enhancedQuery, ragQuery.maxResults || 10)
      
      // 3. 解析和結構化搜索結果
      const feedbackInsights = await this.extractFeedbackInsights(searchResults)
      
      // 4. 生成改進建議
      const improvementSuggestions = await this.generateImprovementSuggestions(feedbackInsights, ragQuery)
      
      // 5. 執行模式分析
      const patternAnalysis = this.analyzePatterns(feedbackInsights)
      
      // 6. 計算整體信心度
      const confidence = this.calculateConfidence(feedbackInsights, ragQuery)
      
      return {
        success: true,
        query: ragQuery.query,
        relevantFeedback: feedbackInsights,
        improvementSuggestions,
        patternAnalysis,
        totalRelevantCases: feedbackInsights.length,
        confidence
      }
      
    } catch (error) {
      console.error('❌ 反饋RAG查詢失敗:', error)
      
      return {
        success: false,
        query: ragQuery.query,
        relevantFeedback: [],
        improvementSuggestions: [],
        patternAnalysis: this.getEmptyPatternAnalysis(),
        totalRelevantCases: 0,
        confidence: 0
      }
    }
  }

  /**
   * 獲取特定錯誤類型的歷史模式
   */
  async getErrorTypePatterns(errorType: string, limit: number = 20): Promise<FeedbackInsight[]> {
    const ragQuery: FeedbackRAGQuery = {
      query: `錯誤類型分析: ${errorType}`,
      errorType,
      maxResults: limit
    }
    
    const result = await this.queryFeedbackInsights(ragQuery)
    return result.relevantFeedback
  }

  /**
   * 為特定分類問題獲取改進建議
   */
  async getClassificationImprovements(
    originalCategory: IntentCategory,
    correctCategory?: IntentCategory,
    contextDetails?: string
  ): Promise<string[]> {
    let query = `分類改進: ${originalCategory}`
    
    if (correctCategory) {
      query += ` 應該是 ${correctCategory}`
    }
    
    if (contextDetails) {
      query += ` 上下文: ${contextDetails}`
    }
    
    const ragQuery: FeedbackRAGQuery = {
      query,
      category: originalCategory,
      maxResults: 15
    }
    
    const result = await this.queryFeedbackInsights(ragQuery)
    return result.improvementSuggestions
  }

  /**
   * 分析信心度低的分類案例
   */
  async analyzeLowConfidenceCases(confidenceThreshold: number = 0.7): Promise<FeedbackRAGResult> {
    const ragQuery: FeedbackRAGQuery = {
      query: `低信心度分類 信心度小於 ${confidenceThreshold}`,
      errorType: 'low_confidence',
      maxResults: 25
    }
    
    return await this.queryFeedbackInsights(ragQuery)
  }

  /**
   * 建構增強查詢字符串
   */
  private buildEnhancedQuery(ragQuery: FeedbackRAGQuery): string {
    let enhancedQuery = ragQuery.query
    
    // 添加分類篩選
    if (ragQuery.category) {
      enhancedQuery += ` 分類:${ragQuery.category}`
    }
    
    // 添加錯誤類型篩選
    if (ragQuery.errorType) {
      enhancedQuery += ` 錯誤類型:${ragQuery.errorType}`
    }
    
    // 添加技術複雜度篩選
    if (ragQuery.technicalComplexity) {
      enhancedQuery += ` 技術複雜度:${ragQuery.technicalComplexity}`
    }
    
    // 添加反饋相關關鍵詞
    enhancedQuery += ' 反饋分析 錯誤模式 分類錯誤 改進建議'
    
    return enhancedQuery
  }

  /**
   * 搜索相關的反饋數據
   */
  private async searchRelevantFeedback(query: string, maxResults: number): Promise<any[]> {
    try {
      // 首先搜索facts/edges
      const factResults = await this.graphitiClient.search_facts(query, {
        num_results: Math.floor(maxResults * 0.6)
      })
      
      // 然後搜索nodes
      const nodeResults = await this.graphitiClient.search_nodes(query, {
        num_results: Math.floor(maxResults * 0.4)
      })
      
      // 合併結果
      return [...(factResults || []), ...(nodeResults || [])]
      
    } catch (error) {
      console.error('搜索相關反饋失敗:', error)
      return []
    }
  }

  /**
   * 從搜索結果中提取反饋洞察
   */
  private async extractFeedbackInsights(searchResults: any[]): Promise<FeedbackInsight[]> {
    const insights: FeedbackInsight[] = []
    
    for (const result of searchResults) {
      try {
        // 解析Graphiti結果
        let feedbackData: any = {}
        
        if (result.fact) {
          // 從fact中提取數據
          feedbackData = this.parseFeedbackFromFact(result.fact)
        } else if (result.properties || result.metadata) {
          // 從node properties中提取數據
          feedbackData = result.properties || result.metadata || {}
        }
        
        if (feedbackData.feedback_id || feedbackData.feedbackId) {
          const insight: FeedbackInsight = {
            feedbackId: feedbackData.feedback_id || feedbackData.feedbackId || 'unknown',
            errorType: feedbackData.error_type || 'unknown',
            originalCategory: feedbackData.original_category || feedbackData.originalClassification?.category || 'unknown',
            correctCategory: feedbackData.correct_category || feedbackData.correctClassification?.category || 'unknown',
            rootCause: feedbackData.root_cause || feedbackData.errorAnalysis?.rootCause || 'unknown',
            missedSignals: feedbackData.missed_signals || feedbackData.errorAnalysis?.missedSignals || [],
            recommendedActions: this.extractRecommendedActions(feedbackData),
            similarity: result.weight || 0.8, // 預設相似度
            timestamp: feedbackData.timestamp || new Date().toISOString()
          }
          
          insights.push(insight)
        }
      } catch (parseError) {
        console.warn('解析反饋洞察失敗:', parseError)
        continue
      }
    }
    
    // 按相似度排序
    return insights.sort((a, b) => b.similarity - a.similarity)
  }

  /**
   * 從fact字符串中解析反饋數據
   */
  private parseFeedbackFromFact(fact: string): any {
    try {
      // 嘗試提取JSON數據
      const jsonMatch = fact.match(/\{.*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // 或者解析結構化文本
      const feedbackData: any = {}
      
      // 提取基本信息
      const feedbackIdMatch = fact.match(/反饋ID[:\s]*([^\s,]+)/)
      if (feedbackIdMatch) feedbackData.feedback_id = feedbackIdMatch[1]
      
      const errorTypeMatch = fact.match(/錯誤類型[:\s]*([^\s,]+)/)
      if (errorTypeMatch) feedbackData.error_type = errorTypeMatch[1]
      
      const originalCategoryMatch = fact.match(/原始分類[:\s]*([^\s,→]+)/)
      if (originalCategoryMatch) feedbackData.original_category = originalCategoryMatch[1]
      
      const correctCategoryMatch = fact.match(/正確分類[:\s]*([^\s,]+)/)
      if (correctCategoryMatch) feedbackData.correct_category = correctCategoryMatch[1]
      
      return feedbackData
      
    } catch (error) {
      console.warn('解析fact失敗:', error)
      return {}
    }
  }

  /**
   * 從反饋數據中提取推薦行動
   */
  private extractRecommendedActions(feedbackData: any): string[] {
    const actions: string[] = []
    
    // 從不同來源提取建議
    if (feedbackData.recommendations) {
      const recs = feedbackData.recommendations
      if (recs.modelTraining) actions.push(...recs.modelTraining)
      if (recs.promptOptimization) actions.push(...recs.promptOptimization)
      if (recs.classificationRules) actions.push(...recs.classificationRules)
      if (recs.qualityAssurance) actions.push(...recs.qualityAssurance)
    }
    
    if (feedbackData.recommended_actions) {
      actions.push(...feedbackData.recommended_actions)
    }
    
    return [...new Set(actions)] // 去重
  }

  /**
   * 基於洞察生成改進建議
   */
  private async generateImprovementSuggestions(
    insights: FeedbackInsight[],
    ragQuery: FeedbackRAGQuery
  ): Promise<string[]> {
    const suggestions: string[] = []
    
    if (insights.length === 0) {
      return ['未找到相關的歷史反饋數據，建議收集更多案例進行分析']
    }
    
    // 根據錯誤類型生成建議
    const errorTypes = insights.map(i => i.errorType)
    const mostCommonError = this.getMostFrequent(errorTypes)
    
    switch (mostCommonError) {
      case 'misclassification':
        suggestions.push('檢視分類模型的決策邊界，考慮增加更多訓練數據')
        suggestions.push('優化特徵提取，特別關注區別性特徵')
        break
        
      case 'low_confidence':
        suggestions.push('提高模型的信心度閾值設置')
        suggestions.push('加入人工審核流程處理低信心度案例')
        break
        
      case 'context_misunderstanding':
        suggestions.push('改進上下文窗口大小和處理邏輯')
        suggestions.push('加強語義理解模型的訓練')
        break
        
      case 'keyword_mismatch':
        suggestions.push('更新關鍵詞字典和權重配置')
        suggestions.push('實施動態關鍵詞學習機制')
        break
    }
    
    // 基於missed signals生成建議
    const allMissedSignals = insights.flatMap(i => i.missedSignals)
    const topMissedSignals = this.getTopFrequent(allMissedSignals, 3)
    
    topMissedSignals.forEach(signal => {
      suggestions.push(`加強對"${signal}"信號的檢測和權重`)
    })
    
    // 基於推薦行動生成建議
    const allActions = insights.flatMap(i => i.recommendedActions)
    const topActions = this.getTopFrequent(allActions, 5)
    
    suggestions.push(...topActions)
    
    return [...new Set(suggestions)] // 去重
  }

  /**
   * 分析反饋模式
   */
  private analyzePatterns(insights: FeedbackInsight[]): PatternAnalysis {
    const totalCases = insights.length
    
    if (totalCases === 0) {
      return this.getEmptyPatternAnalysis()
    }
    
    // 錯誤類型分析
    const errorTypeCounts = this.countFrequency(insights.map(i => i.errorType))
    const commonErrorTypes = Object.entries(errorTypeCounts)
      .map(([type, frequency]) => ({
        type,
        frequency,
        percentage: Math.round((frequency / totalCases) * 100)
      }))
      .sort((a, b) => b.frequency - a.frequency)
    
    // 遺漏信號分析
    const allMissedSignals = insights.flatMap(i => i.missedSignals)
    const missedSignalCounts = this.countFrequency(allMissedSignals)
    const frequentMissedSignals = Object.entries(missedSignalCounts)
      .map(([signal, frequency]) => ({
        signal,
        frequency,
        categories: [...new Set(
          insights
            .filter(i => i.missedSignals.includes(signal))
            .map(i => i.originalCategory)
        )]
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
    
    // 推薦建議模式分析
    const allRecommendations = insights.flatMap(i => i.recommendedActions)
    const recommendationCounts = this.countFrequency(allRecommendations)
    const recommendationPatterns = Object.entries(recommendationCounts)
      .map(([recommendation, frequency]) => ({
        recommendation,
        frequency,
        contexts: [...new Set(
          insights
            .filter(i => i.recommendedActions.includes(recommendation))
            .map(i => `${i.originalCategory}->${i.correctCategory}`)
        )]
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8)
    
    // 分類混淆矩陣
    const categoryPairs = insights.map(i => `${i.originalCategory}->${i.correctCategory}`)
    const categoryPairCounts = this.countFrequency(categoryPairs)
    const categoryConfusionMatrix = Object.entries(categoryPairCounts)
      .map(([pair, frequency]) => {
        const [from, to] = pair.split('->')
        return { from, to, frequency }
      })
      .sort((a, b) => b.frequency - a.frequency)
    
    return {
      commonErrorTypes,
      frequentMissedSignals,
      recommendationPatterns,
      categoryConfusionMatrix
    }
  }

  /**
   * 計算查詢結果的信心度
   */
  private calculateConfidence(insights: FeedbackInsight[], ragQuery: FeedbackRAGQuery): number {
    if (insights.length === 0) return 0
    
    let confidence = 0
    
    // 基於結果數量的信心度
    const resultCountFactor = Math.min(insights.length / 10, 1) * 0.3
    
    // 基於相似度的信心度
    const avgSimilarity = insights.reduce((sum, insight) => sum + insight.similarity, 0) / insights.length
    const similarityFactor = avgSimilarity * 0.4
    
    // 基於查詢特異性的信心度
    let specificityFactor = 0.3
    if (ragQuery.category) specificityFactor += 0.05
    if (ragQuery.errorType) specificityFactor += 0.05
    if (ragQuery.technicalComplexity) specificityFactor += 0.05
    
    confidence = resultCountFactor + similarityFactor + specificityFactor
    
    return Math.min(Math.max(confidence, 0), 1) // 確保在0-1範圍內
  }

  /**
   * 工具方法：計算頻率
   */
  private countFrequency<T>(items: T[]): Record<string, number> {
    const counts: Record<string, number> = {}
    items.forEach(item => {
      const key = String(item)
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }

  /**
   * 工具方法：獲取最常見項目
   */
  private getMostFrequent<T>(items: T[]): T | null {
    const counts = this.countFrequency(items)
    const entries = Object.entries(counts)
    
    if (entries.length === 0) return null
    
    const mostFrequent = entries.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )
    
    return mostFrequent[0] as T
  }

  /**
   * 工具方法：獲取最常見的前N項
   */
  private getTopFrequent<T>(items: T[], topN: number): T[] {
    const counts = this.countFrequency(items)
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, topN)
      .map(([item]) => item as T)
  }

  /**
   * 獲取空的模式分析結構
   */
  private getEmptyPatternAnalysis(): PatternAnalysis {
    return {
      commonErrorTypes: [],
      frequentMissedSignals: [],
      recommendationPatterns: [],
      categoryConfusionMatrix: []
    }
  }
}