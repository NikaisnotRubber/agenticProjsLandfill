/**
 * Graphiti related type definitions
 */

export enum EpisodeType {
  text = 'text',
  message = 'message', 
  json = 'json',
  event = 'event'
}

export interface GraphitiClientConfig {
  neo4j_uri: string
  neo4j_user: string
  neo4j_password: string
  database?: string
}

export interface GraphitiEpisode {
  name: string
  episode_body: string
  source: EpisodeType
  source_description?: string
  reference_time: string
  metadata?: Record<string, any>
}

export interface GraphitiSearchResult {
  nodes?: GraphitiNode[]
  edges?: GraphitiEdge[]
  facts?: string[]
  total_count?: number
}

export interface GraphitiNode {
  uuid: string
  name?: string
  type?: string
  properties?: Record<string, any>
}

export interface GraphitiEdge {
  uuid: string
  source_node_uuid: string
  target_node_uuid: string
  fact: string
  weight?: number
  created_at?: string
}

export interface GraphitiEntityEdge {
  fact: string
  source?: string
  target?: string
  weight?: number
}

export interface FeedbackGraphitiMetadata {
  feedback_id: string
  error_type: string
  original_category: string
  correct_category: string
  technical_complexity?: string
  sender?: string
  domain_areas?: string[]
  processing_agent?: string
  new_patterns_count?: number
  updated_keywords_count?: number
  improved_rules_count?: number
  total_recommendations?: number
  model_training_count?: number
  prompt_optimization_count?: number
  pattern_complexity?: number
}