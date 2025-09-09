import { DateTime } from 'luxon'
import { v4 as uuidv4 } from 'uuid'
import { FeedbackData } from '@/types/agent'
import { EpisodeType } from '@/types/graphiti'

export interface GraphitiFeedbackEpisode {
  name: string
  episode_body: string
  source: EpisodeType
  source_description: string
  reference_time: string
  metadata?: Record<string, any>
}

export interface GraphitiFeedbackIngestionResult {
  success: boolean
  episodeIds: string[]
  errors: string[]
}

export class FeedbackGraphitiService {
  private graphitiClient: any
  
  constructor(graphitiClient: any) {
    this.graphitiClient = graphitiClient
  }

  /**
   * 將反饋數據轉換為多個Graphiti episodes，建立知識圖譜
   * Transform feedback data into multiple Graphiti episodes for knowledge graph construction
   */
  async ingestFeedbackData(feedbackData: FeedbackData): Promise<GraphitiFeedbackIngestionResult> {
    const episodeIds: string[] = []
    const errors: string[] = []
    
    try {
      // 1. 主要反饋分析episode - Main feedback analysis episode
      const mainEpisodeId = await this.createMainFeedbackEpisode(feedbackData)
      episodeIds.push(mainEpisodeId)

      // 2. 錯誤模式分析episode - Error pattern analysis episode  
      const errorPatternEpisodeId = await this.createErrorPatternEpisode(feedbackData)
      episodeIds.push(errorPatternEpisodeId)

      // 3. 場景映射episode - Scenario mapping episode
      const scenarioEpisodeId = await this.createScenarioMappingEpisode(feedbackData)
      episodeIds.push(scenarioEpisodeId)

      // 4. 知識更新建議episode - Knowledge update recommendations episode
      const knowledgeUpdateEpisodeId = await this.createKnowledgeUpdateEpisode(feedbackData)
      episodeIds.push(knowledgeUpdateEpisodeId)

      // 5. 系統優化建議episode - System optimization recommendations episode
      const recommendationEpisodeId = await this.createRecommendationEpisode(feedbackData)
      episodeIds.push(recommendationEpisodeId)

      console.log(`✅ 反饋數據成功導入Graphiti，生成${episodeIds.length}個episodes`)
      
      return {
        success: true,
        episodeIds,
        errors
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      console.error('❌ 反饋數據導入Graphiti失敗:', errorMessage)
      errors.push(errorMessage)
      
      return {
        success: false,
        episodeIds,
        errors
      }
    }
  }

  /**
   * 創建主要反饋分析episode
   */
  private async createMainFeedbackEpisode(feedbackData: FeedbackData): Promise<string> {
    const episodeBody = {
      feedback_id: feedbackData.feedbackId,
      timestamp: feedbackData.timestamp,
      original_classification: feedbackData.originalClassification,
      correct_classification: feedbackData.correctClassification,
      error_summary: {
        error_type: feedbackData.errorAnalysis.errorType,
        root_cause: feedbackData.errorAnalysis.rootCause,
        confidence_diff: feedbackData.correctClassification.confidence - feedbackData.originalClassification.confidence
      }
    }

    await this.graphitiClient.add_episode({
      name: `分類錯誤反饋: ${feedbackData.originalClassification.category} → ${feedbackData.correctClassification.category}`,
      episode_body: JSON.stringify(episodeBody),
      source: EpisodeType.json,
      source_description: 'JIRA CS Agent Feedback System',
      reference_time: feedbackData.timestamp,
      metadata: {
        feedback_id: feedbackData.feedbackId,
        error_type: feedbackData.errorAnalysis.errorType,
        original_category: feedbackData.originalClassification.category,
        correct_category: feedbackData.correctClassification.category
      }
    })

    return `feedback-main-${feedbackData.feedbackId}`
  }

  /**
   * 創建錯誤模式分析episode
   */
  private async createErrorPatternEpisode(feedbackData: FeedbackData): Promise<string> {
    const errorPatternBody = {
      error_analysis: feedbackData.errorAnalysis,
      pattern_insights: {
        missed_signals_count: feedbackData.errorAnalysis.missedSignals.length,
        incorrect_assumptions_count: feedbackData.errorAnalysis.incorrectAssumptions.length,
        key_missed_signals: feedbackData.errorAnalysis.missedSignals.slice(0, 3), // 前3個最重要的
        critical_assumptions: feedbackData.errorAnalysis.incorrectAssumptions.slice(0, 3)
      }
    }

    await this.graphitiClient.add_episode({
      name: `錯誤模式分析: ${feedbackData.errorAnalysis.errorType}`,
      episode_body: JSON.stringify(errorPatternBody),
      source: EpisodeType.json,
      source_description: 'Error Pattern Analysis',
      reference_time: feedbackData.timestamp,
      metadata: {
        feedback_id: feedbackData.feedbackId,
        error_type: feedbackData.errorAnalysis.errorType,
        pattern_complexity: feedbackData.errorAnalysis.missedSignals.length + feedbackData.errorAnalysis.incorrectAssumptions.length
      }
    })

    return `feedback-error-pattern-${feedbackData.feedbackId}`
  }

  /**
   * 創建場景映射episode
   */
  private async createScenarioMappingEpisode(feedbackData: FeedbackData): Promise<string> {
    const scenarioBody = {
      scenario_mapping: feedbackData.scenarioMapping,
      context_analysis: {
        email_complexity: feedbackData.scenarioMapping.emailContext.technicalComplexity,
        domain_areas: feedbackData.scenarioMapping.emailContext.domainArea,
        processing_agent: feedbackData.scenarioMapping.processingContext.initialAgent,
        identified_patterns_count: feedbackData.scenarioMapping.processingContext.identifiedPatterns.length,
        missing_patterns_count: feedbackData.scenarioMapping.processingContext.missingPatterns.length
      }
    }

    await this.graphitiClient.add_episode({
      name: `場景分析: ${feedbackData.scenarioMapping.emailContext.subject.substring(0, 50)}...`,
      episode_body: JSON.stringify(scenarioBody),
      source: EpisodeType.json,
      source_description: 'Email Scenario Mapping',
      reference_time: feedbackData.timestamp,
      metadata: {
        feedback_id: feedbackData.feedbackId,
        technical_complexity: feedbackData.scenarioMapping.emailContext.technicalComplexity,
        sender: feedbackData.scenarioMapping.emailContext.sender,
        domain_areas: feedbackData.scenarioMapping.emailContext.domainArea,
        processing_agent: feedbackData.scenarioMapping.processingContext.initialAgent
      }
    })

    return `feedback-scenario-${feedbackData.feedbackId}`
  }

  /**
   * 創建知識更新建議episode
   */
  private async createKnowledgeUpdateEpisode(feedbackData: FeedbackData): Promise<string> {
    const knowledgeBody = {
      knowledge_updates: feedbackData.knowledgeUpdate,
      update_summary: {
        new_patterns_count: feedbackData.knowledgeUpdate.newPatterns.length,
        updated_keywords_count: feedbackData.knowledgeUpdate.updatedKeywords.length,
        improved_rules_count: feedbackData.knowledgeUpdate.improvedRules.length,
        priority_patterns: feedbackData.knowledgeUpdate.newPatterns
          .filter(p => p.weight > 0.7)
          .map(p => ({ pattern: p.pattern, category: p.category, weight: p.weight })),
        high_importance_keywords: feedbackData.knowledgeUpdate.updatedKeywords
          .filter(k => k.importance > 7)
          .map(k => ({ keyword: k.keyword, category: k.category, importance: k.importance }))
      }
    }

    await this.graphitiClient.add_episode({
      name: `知識更新建議: ${feedbackData.knowledgeUpdate.newPatterns.length}個新模式, ${feedbackData.knowledgeUpdate.updatedKeywords.length}個關鍵詞`,
      episode_body: JSON.stringify(knowledgeBody),
      source: EpisodeType.json,
      source_description: 'Knowledge Update Recommendations',
      reference_time: feedbackData.timestamp,
      metadata: {
        feedback_id: feedbackData.feedbackId,
        new_patterns_count: feedbackData.knowledgeUpdate.newPatterns.length,
        updated_keywords_count: feedbackData.knowledgeUpdate.updatedKeywords.length,
        improved_rules_count: feedbackData.knowledgeUpdate.improvedRules.length
      }
    })

    return `feedback-knowledge-update-${feedbackData.feedbackId}`
  }

  /**
   * 創建系統優化建議episode
   */
  private async createRecommendationEpisode(feedbackData: FeedbackData): Promise<string> {
    const recommendationBody = {
      recommendations: feedbackData.recommendations,
      recommendation_summary: {
        total_model_training_suggestions: feedbackData.recommendations.modelTraining.length,
        total_prompt_optimizations: feedbackData.recommendations.promptOptimization.length,
        total_classification_rules: feedbackData.recommendations.classificationRules.length,
        total_qa_improvements: feedbackData.recommendations.qualityAssurance.length,
        priority_actions: [
          ...feedbackData.recommendations.modelTraining.slice(0, 2),
          ...feedbackData.recommendations.promptOptimization.slice(0, 2)
        ]
      }
    }

    await this.graphitiClient.add_episode({
      name: `系統優化建議: ${Object.values(feedbackData.recommendations).flat().length}項建議`,
      episode_body: JSON.stringify(recommendationBody),
      source: EpisodeType.json,
      source_description: 'System Optimization Recommendations',
      reference_time: feedbackData.timestamp,
      metadata: {
        feedback_id: feedbackData.feedbackId,
        total_recommendations: Object.values(feedbackData.recommendations).flat().length,
        model_training_count: feedbackData.recommendations.modelTraining.length,
        prompt_optimization_count: feedbackData.recommendations.promptOptimization.length
      }
    })

    return `feedback-recommendation-${feedbackData.feedbackId}`
  }

  /**
   * 查詢相似的錯誤模式和反饋
   */
  async searchSimilarFeedback(query: string, numResults: number = 10): Promise<any> {
    try {
      const searchResults = await this.graphitiClient.search(
        query,
        { num_results: numResults }
      )
      
      return {
        success: true,
        results: searchResults,
        count: searchResults.length
      }
    } catch (error) {
      console.error('搜索相似反饋失敗:', error)
      return {
        success: false,
        results: [],
        error: error instanceof Error ? error.message : '搜索失敗'
      }
    }
  }

  /**
   * 獲取特定類型的錯誤模式統計
   */
  async getErrorPatternStatistics(errorType?: string): Promise<any> {
    try {
      const query = errorType 
        ? `錯誤類型: ${errorType} 統計分析`
        : '所有錯誤類型統計分析'
        
      const searchResults = await this.graphitiClient.search(
        query,
        { num_results: 50 }
      )
      
      // 這裡可以添加統計邏輯來分析搜索結果
      return {
        success: true,
        query,
        total_feedback_entries: searchResults.length,
        results: searchResults
      }
    } catch (error) {
      console.error('獲取錯誤模式統計失敗:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '統計分析失敗'
      }
    }
  }

  /**
   * 基於歷史反饋改進分類建議
   */
  async getClassificationImprovementSuggestions(originalClassification: any): Promise<any> {
    try {
      const query = `分類改進建議: ${originalClassification.category} 錯誤分類模式 信心度${originalClassification.confidence}`
      
      const similarCases = await this.graphitiClient.search(
        query,
        { num_results: 15 }
      )
      
      return {
        success: true,
        original_category: originalClassification.category,
        confidence: originalClassification.confidence,
        similar_cases_count: similarCases.length,
        improvement_suggestions: similarCases,
        recommended_actions: this.extractRecommendedActions(similarCases)
      }
    } catch (error) {
      console.error('獲取分類改進建議失敗:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '建議生成失敗'
      }
    }
  }

  /**
   * 從搜索結果中提取推薦行動
   */
  private extractRecommendedActions(searchResults: any[]): string[] {
    // 這裡可以實現更複雜的邏輯來分析搜索結果並提取行動建議
    const actions: string[] = []
    
    // 簡單的示例邏輯
    if (searchResults.length > 5) {
      actions.push('考慮增加更多訓練數據')
    }
    if (searchResults.length > 10) {
      actions.push('檢討現有分類規則')
      actions.push('優化關鍵詞權重')
    }
    
    return actions
  }
}