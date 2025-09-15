import { ChatOpenAI } from '@langchain/openai'
import { v4 as uuidv4 } from 'uuid'
import { AgentConfig, AgentMessage, WorkflowState } from '@/types/agent'
import { OpenAIService } from '@/lib/services/openai-service'

export abstract class BaseAgent {
  protected config: AgentConfig
  protected openaiService: OpenAIService
  protected llm: ChatOpenAI

  constructor(config: AgentConfig) {
    this.config = config
    
    // Initialize OpenAI service with direct client
    this.openaiService = new OpenAIService(
      config.model,
      config.temperature,
      config.maxTokens
    )
    
    // Keep LangChain ChatOpenAI instance for compatibility
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: process.env.OPENAI_BASE_URL
      },
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    })
  }

  abstract execute(state: WorkflowState): Promise<WorkflowState>

  protected async generateResponse(prompt: string, context?: string): Promise<string> {
    const systemMessage = this.config.systemPrompt
    const userMessage = context ? `${context}\n\n${prompt}` : prompt

    const response = await this.llm.invoke([
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ])

    return response.content as string
  }

  // Direct OpenAI service method for response generation
  protected async generateResponseDirect(prompt: string, context?: string): Promise<string> {
    const systemMessage = this.config.systemPrompt
    const userMessage = context ? `${context}\n\n${prompt}` : prompt

    return await this.openaiService.generateResponse(systemMessage, userMessage)
  }

  protected addMessage(state: WorkflowState, type: 'system' | 'human' | 'ai', content: string): WorkflowState {
    const message: AgentMessage = {
      id: uuidv4(),
      type,
      content,
      timestamp: new Date()
    }

    return {
      ...state,
      messages: [...state.messages, message]
    }
  }

  protected updateResult(state: WorkflowState, action: string, response: string, status: 'pending' | 'processing' | 'completed' | 'failed', metadata?: Record<string, any>): WorkflowState {
    return {
      ...state,
      result: {
        action,
        response,
        status,
        metadata
      }
    }
  }
}