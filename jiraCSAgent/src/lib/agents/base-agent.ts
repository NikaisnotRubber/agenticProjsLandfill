import { v4 as uuidv4 } from 'uuid'
import { AgentConfig, AgentMessage, WorkflowState } from '@/types/agent'
import OpenAI from 'openai'

export abstract class BaseAgent {
  protected config: AgentConfig
  protected openaiClient: OpenAI

  constructor(config: AgentConfig) {
    this.config = config

    // Initialize OpenAI direct client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    })
  }

  abstract execute(state: WorkflowState): Promise<WorkflowState>

  protected async generateResponse(prompt: string, context?: string): Promise<string> {
    // Redirect to direct method for consistency
    return this.generateResponseDirect(prompt, context)
  }

  // Direct OpenAI client method for response generation
  protected async generateResponseDirect(
    prompt: string,
    context?: string,
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    const systemMessage = this.config.systemPrompt
    const userMessage = context ? `${context}\n\n${prompt}` : prompt

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: options?.model || this.config.model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage }
        ],
        temperature: options?.temperature || this.config.temperature,
        max_tokens: options?.maxTokens || this.config.maxTokens
      })

      return response.choices[0]?.message?.content || ''
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error(`OpenAI API Error (Status: ${error.status}):`, {
          status: error.status,
          name: error.name,
          message: error.message,
          request_id: error.request_id || 'N/A'
        })
        throw new Error(`OpenAI API Error: ${error.status} - ${error.message}`)
      } else if (error instanceof Error) {
        console.error('OpenAI API 調用錯誤:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
        throw new Error(`OpenAI API 調用失敗: ${error.message}`)
      } else {
        console.error('未知的 OpenAI API 錯誤:', error)
        throw new Error('發生未知的 OpenAI API 錯誤')
      }
    }
  }

  // Generate response from multiple messages
  protected async generateResponseFromMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    try {
      const response = await this.openaiClient.chat.completions.create({
        model: options?.model || this.config.model,
        messages,
        temperature: options?.temperature || this.config.temperature,
        max_tokens: options?.maxTokens || this.config.maxTokens
      })

      return response.choices[0]?.message?.content || ''
    } catch (error) {
      if (error instanceof OpenAI.APIError) {
        console.error(`OpenAI API Error (Status: ${error.status}):`, {
          status: error.status,
          name: error.name,
          message: error.message,
          request_id: error.request_id || 'N/A'
        })
        throw new Error(`OpenAI API Error: ${error.status} - ${error.message}`)
      } else if (error instanceof Error) {
        console.error('OpenAI API 調用錯誤:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
        throw new Error(`OpenAI API 調用失敗: ${error.message}`)
      } else {
        console.error('未知的 OpenAI API 錯誤:', error)
        throw new Error('發生未知的 OpenAI API 錯誤')
      }
    }
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