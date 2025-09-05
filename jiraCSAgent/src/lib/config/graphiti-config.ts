/**
 * Graphiti Configuration
 * Graphiti服務的配置設定
 */

export interface GraphitiConfig {
  // Neo4j 連接配置
  neo4j: {
    uri: string
    user: string
    password: string
    database?: string
    maxConnectionPoolSize?: number
    connectionTimeout?: number
  }
  
  // Python服務配置
  python: {
    pythonPath?: string
    scriptPath?: string
    timeout?: number
    maxRetries?: number
  }
  
  // API服務配置 (如果使用HTTP API)
  api: {
    baseUrl?: string
    timeout?: number
    apiKey?: string
  }
  
  // Graphiti特定配置
  graphiti: {
    // 索引和約束設定
    autoCreateIndices?: boolean
    
    // 搜索配置
    defaultSearchLimit?: number
    maxSearchResults?: number
    searchTimeout?: number
    
    // Episode配置
    defaultEpisodeSource?: string
    maxEpisodeBodyLength?: number
    
    // 反饋特定配置
    feedbackNamespace?: string
    enableFeedbackMetadata?: boolean
    feedbackRetentionDays?: number
  }
  
  // 性能配置
  performance: {
    batchSize?: number
    maxConcurrentRequests?: number
    cacheEnabled?: boolean
    cacheTTL?: number
  }
  
  // 日誌配置
  logging: {
    level?: 'debug' | 'info' | 'warn' | 'error'
    enableGraphitiLogs?: boolean
    logFilePath?: string
  }
}

/**
 * 預設Graphiti配置
 */
export const defaultGraphitiConfig: GraphitiConfig = {
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'test1234',
    database: process.env.NEO4J_DATABASE || 'neo4j',
    maxConnectionPoolSize: 50,
    connectionTimeout: 30000
  },
  
  python: {
    pythonPath: process.env.PYTHON_PATH || 'python3',
    scriptPath: process.env.GRAPHITI_SCRIPT_PATH || './src/lib/integrations/graphiti-bridge.py',
    timeout: 120000, // 2分鐘
    maxRetries: 3
  },
  
  api: {
    baseUrl: process.env.GRAPHITI_API_URL,
    timeout: 60000, // 1分鐘
    apiKey: process.env.GRAPHITI_API_KEY
  },
  
  graphiti: {
    autoCreateIndices: true,
    defaultSearchLimit: 10,
    maxSearchResults: 100,
    searchTimeout: 30000,
    defaultEpisodeSource: 'json',
    maxEpisodeBodyLength: 50000, // 50KB
    feedbackNamespace: 'jira_cs_feedback',
    enableFeedbackMetadata: true,
    feedbackRetentionDays: 365 // 1年
  },
  
  performance: {
    batchSize: 10,
    maxConcurrentRequests: 5,
    cacheEnabled: true,
    cacheTTL: 300000 // 5分鐘
  },
  
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    enableGraphitiLogs: process.env.ENABLE_GRAPHITI_LOGS === 'true',
    logFilePath: process.env.GRAPHITI_LOG_PATH || './logs/graphiti.log'
  }
}

/**
 * 環境特定配置
 */
export const environmentConfigs = {
  development: {
    ...defaultGraphitiConfig,
    logging: {
      ...defaultGraphitiConfig.logging,
      level: 'debug' as const,
      enableGraphitiLogs: true
    },
    graphiti: {
      ...defaultGraphitiConfig.graphiti,
      autoCreateIndices: true
    }
  },
  
  production: {
    ...defaultGraphitiConfig,
    neo4j: {
      ...defaultGraphitiConfig.neo4j,
      maxConnectionPoolSize: 100,
      connectionTimeout: 60000
    },
    performance: {
      ...defaultGraphitiConfig.performance,
      batchSize: 20,
      maxConcurrentRequests: 10
    },
    logging: {
      ...defaultGraphitiConfig.logging,
      level: 'warn' as const,
      enableGraphitiLogs: false
    }
  },
  
  test: {
    ...defaultGraphitiConfig,
    neo4j: {
      ...defaultGraphitiConfig.neo4j,
      database: 'test_neo4j'
    },
    graphiti: {
      ...defaultGraphitiConfig.graphiti,
      feedbackRetentionDays: 30 // 測試環境保留30天
    },
    logging: {
      ...defaultGraphitiConfig.logging,
      level: 'error' as const
    }
  }
}

/**
 * 獲取當前環境的配置
 */
export function getGraphitiConfig(): GraphitiConfig {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'production':
      return environmentConfigs.production
    case 'test':
      return environmentConfigs.test
    default:
      return environmentConfigs.development
  }
}

/**
 * 驗證配置的完整性
 */
export function validateGraphitiConfig(config: GraphitiConfig): string[] {
  const errors: string[] = []
  
  // 檢查必需的Neo4j配置
  if (!config.neo4j.uri) {
    errors.push('Neo4j URI is required')
  }
  
  if (!config.neo4j.user) {
    errors.push('Neo4j user is required')
  }
  
  if (!config.neo4j.password) {
    errors.push('Neo4j password is required')
  }
  
  // 檢查Python配置 (如果使用Python橋接)
  if (!config.api.baseUrl && !config.python.scriptPath) {
    errors.push('Either API URL or Python script path must be configured')
  }
  
  // 檢查數值範圍
  if (config.graphiti.maxSearchResults && config.graphiti.maxSearchResults > 1000) {
    errors.push('Max search results should not exceed 1000 for performance reasons')
  }
  
  if (config.performance.batchSize && config.performance.batchSize > 100) {
    errors.push('Batch size should not exceed 100 for stability')
  }
  
  return errors
}

/**
 * 從環境變數載入配置覆蓋
 */
export function loadConfigFromEnvironment(): Partial<GraphitiConfig> {
  const envConfig: Partial<GraphitiConfig> = {}
  
  // Neo4j配置
  if (process.env.NEO4J_URI || process.env.NEO4J_USER || process.env.NEO4J_PASSWORD) {
    envConfig.neo4j = {
      uri: process.env.NEO4J_URI || defaultGraphitiConfig.neo4j.uri,
      user: process.env.NEO4J_USER || defaultGraphitiConfig.neo4j.user,
      password: process.env.NEO4J_PASSWORD || defaultGraphitiConfig.neo4j.password,
      database: process.env.NEO4J_DATABASE
    }
  }
  
  // API配置
  if (process.env.GRAPHITI_API_URL) {
    envConfig.api = {
      baseUrl: process.env.GRAPHITI_API_URL,
      apiKey: process.env.GRAPHITI_API_KEY
    }
  }
  
  // Python配置
  if (process.env.PYTHON_PATH || process.env.GRAPHITI_SCRIPT_PATH) {
    envConfig.python = {
      pythonPath: process.env.PYTHON_PATH,
      scriptPath: process.env.GRAPHITI_SCRIPT_PATH
    }
  }
  
  // 性能配置
  if (process.env.GRAPHITI_BATCH_SIZE || process.env.GRAPHITI_MAX_CONCURRENT) {
    envConfig.performance = {
      batchSize: process.env.GRAPHITI_BATCH_SIZE ? parseInt(process.env.GRAPHITI_BATCH_SIZE) : undefined,
      maxConcurrentRequests: process.env.GRAPHITI_MAX_CONCURRENT ? parseInt(process.env.GRAPHITI_MAX_CONCURRENT) : undefined
    }
  }
  
  return envConfig
}

/**
 * 合併配置
 */
export function mergeConfigs(baseConfig: GraphitiConfig, overrideConfig: Partial<GraphitiConfig>): GraphitiConfig {
  return {
    neo4j: { ...baseConfig.neo4j, ...overrideConfig.neo4j },
    python: { ...baseConfig.python, ...overrideConfig.python },
    api: { ...baseConfig.api, ...overrideConfig.api },
    graphiti: { ...baseConfig.graphiti, ...overrideConfig.graphiti },
    performance: { ...baseConfig.performance, ...overrideConfig.performance },
    logging: { ...baseConfig.logging, ...overrideConfig.logging }
  }
}

/**
 * 打印配置摘要 (隱藏敏感信息)
 */
export function printConfigSummary(config: GraphitiConfig): void {
  console.log('📋 Graphiti配置摘要:')
  console.log(`   Neo4j: ${config.neo4j.uri} (${config.neo4j.database || 'default'})`)
  console.log(`   用戶: ${config.neo4j.user}`)
  console.log(`   Python路徑: ${config.python.pythonPath}`)
  console.log(`   腳本路徑: ${config.python.scriptPath}`)
  
  if (config.api.baseUrl) {
    console.log(`   API URL: ${config.api.baseUrl}`)
  }
  
  console.log(`   搜索限制: ${config.graphiti.defaultSearchLimit} (最大: ${config.graphiti.maxSearchResults})`)
  console.log(`   批次大小: ${config.performance.batchSize}`)
  console.log(`   日誌級別: ${config.logging.level}`)
  console.log(`   反饋命名空間: ${config.graphiti.feedbackNamespace}`)
}