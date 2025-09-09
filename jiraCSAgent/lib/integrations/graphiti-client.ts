/**
 * Graphiti Client Integration
 * 與Python Graphiti服務的橋接層
 * Bridge layer to Python Graphiti service
 */

import { GraphitiClientConfig, GraphitiEpisode, GraphitiSearchResult, EpisodeType } from '@/types/graphiti'

export class GraphitiClient {
  private config: GraphitiClientConfig
  private pythonProcess: any // 這裡應該是對Python進程的引用
  
  constructor(config: GraphitiClientConfig) {
    this.config = config
  }

  /**
   * 初始化Graphiti客戶端連接
   */
  async initialize(): Promise<boolean> {
    try {
      // 這裡應該建立與Python Graphiti服務的連接
      // 可以通過以下方式實現：
      // 1. 啟動Python子進程
      // 2. 通過HTTP API調用
      // 3. 使用IPC (Inter-Process Communication)
      
      console.log('🔄 初始化Graphiti客戶端連接...')
      console.log(`📡 Neo4j URI: ${this.config.neo4j_uri}`)
      console.log(`👤 Neo4j User: ${this.config.neo4j_user}`)
      
      // TODO: 實際實現連接邏輯
      return true
    } catch (error) {
      console.error('❌ Graphiti客戶端初始化失敗:', error)
      return false
    }
  }

  /**
   * 添加episode到Graphiti圖譜
   */
  async add_episode(episode: GraphitiEpisode): Promise<void> {
    try {
      // TODO: 調用Python Graphiti的add_episode方法
      console.log(`📝 添加Episode: ${episode.name}`)
      console.log(`📊 數據大小: ${episode.episode_body.length} 字符`)
      
      // 模擬API調用
      const payload = {
        name: episode.name,
        episode_body: episode.episode_body,
        source: episode.source,
        source_description: episode.source_description || '',
        reference_time: episode.reference_time,
        metadata: episode.metadata || {}
      }
      
      // 這裡應該實際調用Python服務
      await this.callPythonService('add_episode', payload)
      
    } catch (error) {
      console.error('❌ 添加Episode失敗:', error)
      throw error
    }
  }

  /**
   * 在圖譜中搜索相關信息
   */
  async search(query: string, options: {
    num_results?: number
    center_node_uuid?: string
  } = {}): Promise<any[]> {
    try {
      console.log(`🔍 搜索查詢: ${query}`)
      console.log(`📊 結果數量: ${options.num_results || 10}`)
      
      const payload = {
        query,
        num_results: options.num_results || 10,
        center_node_uuid: options.center_node_uuid
      }
      
      // TODO: 實際調用Python服務
      const results = await this.callPythonService('search', payload)
      
      return results || []
      
    } catch (error) {
      console.error('❌ 圖譜搜索失敗:', error)
      throw error
    }
  }

  /**
   * 搜索節點
   */
  async search_nodes(query: string, options: {
    entity_type?: string
    center_node_uuid?: string
    num_results?: number
  } = {}): Promise<any[]> {
    try {
      const payload = {
        query,
        entity_type: options.entity_type,
        center_node_uuid: options.center_node_uuid,
        num_results: options.num_results || 10
      }
      
      const results = await this.callPythonService('search_nodes', payload)
      return results || []
      
    } catch (error) {
      console.error('❌ 節點搜索失敗:', error)
      throw error
    }
  }

  /**
   * 搜索事實/邊
   */
  async search_facts(query: string, options: {
    center_node_uuid?: string
    num_results?: number
  } = {}): Promise<any[]> {
    try {
      const payload = {
        query,
        center_node_uuid: options.center_node_uuid,
        num_results: options.num_results || 10
      }
      
      const results = await this.callPythonService('search_facts', payload)
      return results || []
      
    } catch (error) {
      console.error('❌ 事實搜索失敗:', error)
      throw error
    }
  }

  /**
   * 建立索引和約束
   */
  async build_indices_and_constraints(): Promise<void> {
    try {
      console.log('🏗️ 建立圖譜索引和約束...')
      await this.callPythonService('build_indices_and_constraints', {})
    } catch (error) {
      console.error('❌ 建立索引和約束失敗:', error)
      throw error
    }
  }

  /**
   * 清理圖譜數據 (謹慎使用)
   */
  async clear_data(): Promise<void> {
    try {
      console.warn('⚠️ 清理圖譜數據 - 這將刪除所有數據!')
      await this.callPythonService('clear_data', {})
    } catch (error) {
      console.error('❌ 清理數據失敗:', error)
      throw error
    }
  }

  /**
   * 獲取圖譜狀態
   */
  async get_status(): Promise<any> {
    try {
      const status = await this.callPythonService('get_status', {})
      return status
    } catch (error) {
      console.error('❌ 獲取狀態失敗:', error)
      throw error
    }
  }

  /**
   * 調用Python服務的通用方法
   * 這裡需要根據實際架構實現
   */
  private async callPythonService(method: string, payload: any): Promise<any> {
    // 選項1: HTTP API調用
    if (process.env.GRAPHITI_API_URL) {
      return this.callGraphitiAPI(method, payload)
    }
    
    // 選項2: Python子進程調用
    if (process.env.GRAPHITI_PYTHON_PATH) {
      return this.callPythonScript(method, payload)
    }
    
    // 選項3: 模擬調用（開發時使用）
    console.log(`📞 模擬調用Python服務: ${method}`)
    console.log('📦 載荷:', JSON.stringify(payload, null, 2))
    
    // 返回模擬結果
    switch (method) {
      case 'search':
      case 'search_nodes':
      case 'search_facts':
        return []
      case 'get_status':
        return { status: 'connected', neo4j_connected: true }
      default:
        return {}
    }
  }

  /**
   * 通過HTTP API調用Graphiti服務
   */
  private async callGraphitiAPI(method: string, payload: any): Promise<any> {
    try {
      const apiUrl = process.env.GRAPHITI_API_URL
      const response = await fetch(`${apiUrl}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP錯誤: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`API調用失敗 [${method}]:`, error)
      throw error
    }
  }

  /**
   * 通過Python子進程調用Graphiti
   */
  private async callPythonScript(method: string, payload: any): Promise<any> {
    try {
      const { spawn } = require('child_process')
      const pythonPath = process.env.GRAPHITI_PYTHON_PATH || 'python'
      const scriptPath = process.env.GRAPHITI_SCRIPT_PATH || './graphiti_bridge.py'
      
      return new Promise((resolve, reject) => {
        const python = spawn(pythonPath, [scriptPath, method])
        
        let stdout = ''
        let stderr = ''
        
        python.stdout.on('data', (data: any) => {
          stdout += data.toString()
        })
        
        python.stderr.on('data', (data: any) => {
          stderr += data.toString()
        })
        
        python.on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`Python腳本執行失敗: ${stderr}`))
          } else {
            try {
              const result = JSON.parse(stdout)
              resolve(result)
            } catch (parseError) {
              reject(new Error(`解析Python輸出失敗: ${parseError}`))
            }
          }
        })
        
        // 發送載荷到Python腳本
        python.stdin.write(JSON.stringify(payload))
        python.stdin.end()
      })
    } catch (error) {
      console.error(`Python腳本調用失敗 [${method}]:`, error)
      throw error
    }
  }
}

/**
 * 創建Graphiti客戶端實例
 */
export function createGraphitiClient(config?: Partial<GraphitiClientConfig>): GraphitiClient {
  const defaultConfig: GraphitiClientConfig = {
    neo4j_uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    neo4j_user: process.env.NEO4J_USER || 'neo4j',
    neo4j_password: process.env.NEO4J_PASSWORD || 'test1234',
    database: process.env.NEO4J_DATABASE || 'neo4j'
  }
  
  const finalConfig = { ...defaultConfig, ...config }
  
  return new GraphitiClient(finalConfig)
}