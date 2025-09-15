import OpenAI from 'openai'

export class OpenAIService {
  private client: OpenAI
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(
    model: string = process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: number = 0.1,
    maxTokens: number = 1000
  ) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    })
    
    this.model = model
    this.temperature = temperature
    this.maxTokens = maxTokens
  }

  async generateResponse(
    systemPrompt: string, 
    userPrompt: string,
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: options?.temperature || this.temperature,
        max_tokens: options?.maxTokens || this.maxTokens
      })

      return response.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('OpenAI API 調用錯誤:', error)
      throw error
    }
  }

  async generateResponseFromMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>,
    options?: {
      temperature?: number
      maxTokens?: number
      model?: string
    }
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || this.model,
        messages,
        temperature: options?.temperature || this.temperature,
        max_tokens: options?.maxTokens || this.maxTokens
      })

      return response.choices[0]?.message?.content || ''
    } catch (error) {
      console.error('OpenAI API 調用錯誤:', error)
      throw error
    }
  }

  // 工廠方法，用於創建不同配置的實例
  static createClassifierService(): OpenAIService {
    return new OpenAIService(
      process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      0.1,
      600
    )
  }

  static createHandlerService(): OpenAIService {
    return new OpenAIService(
      process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      0.1,
      1200
    )
  }

  static createEvaluatorService(): OpenAIService {
    return new OpenAIService(
      process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      0.1,
      800
    )
  }

  static createFeedbackService(): OpenAIService {
    return new OpenAIService(
      process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      0.2,
      1500
    )
  }
}