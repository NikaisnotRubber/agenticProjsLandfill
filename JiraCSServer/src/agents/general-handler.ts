import OpenAI from 'openai';
import { config } from '../utils/config';
import { AgentOutput, AgentOutputSchema, GeneralHandlerInput, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

export class GeneralHandlerAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });
  }

  async handle(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();
    const request = state.original_request;

    try {
      const input: GeneralHandlerInput = {
        issue_summary: request.forms.Summary,
        comment_content: request.forms.Comment.Content,
        classification_notes: state.classification?.reasoning || '',
        metadata: {
          reporter: request.forms.Reporter,
          issue_type: request.forms["Issue Type"],
          created: request.forms.Created,
          classification_category: state.classification?.category,
        },
      };

      const response = await this.generateResponse(input);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'general_handling',
        agent_name: 'GeneralHandlerAgent',
        timestamp: new Date().toISOString(),
        input,
        output: {
          ...response,
          processing_time: processingTime,
        },
        success: true,
      };

      return {
        current_response: response.response_content,
        processing_history: [processingStep],
        current_agent: 'GeneralHandlerAgent',
        next_action: 'quality_evaluation',
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'general_handling',
        agent_name: 'GeneralHandlerAgent',
        timestamp: new Date().toISOString(),
        input: {
          issue_summary: request.forms.Summary,
          comment_content: request.forms.Comment.Content,
          classification_notes: '',
          metadata: {},
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_general_handling',
          response_content: 'General handling failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `General handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async generateResponse(input: GeneralHandlerInput): Promise<AgentOutput> {
    const systemPrompt = this.buildSystemPrompt();
    const userContent = this.buildUserContent(input);

    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'general_handler_response',
          schema: AgentOutputSchema,
        },
      },
      temperature: 0.4,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response received from OpenAI');
    }

    return JSON.parse(result) as AgentOutput;
  }

  private buildSystemPrompt(): string {
    return `You are a versatile customer service representative handling general inquiries and non-technical Jira requests. Your role encompasses:

**General Customer Service:**
- Policy explanations and company information
- Training and educational resources
- Feature requests and suggestions
- General usage guidance and best practices
- Cross-functional coordination and referrals

**Non-Technical Support:**
- Business process questions
- User onboarding and training requests
- License and subscription inquiries
- General troubleshooting for common issues
- Documentation and resource recommendations

**Communication Excellence:**
- Professional and empathetic customer service
- Clear explanations in Traditional Chinese
- Appropriate escalation when needed
- Resource discovery and recommendation
- Follow-up and relationship management

**Your Response Approach:**
1. **Active Listening** - Demonstrate understanding of the customer's needs
2. **Solution-Oriented** - Provide practical help or clear next steps
3. **Resourceful** - Connect customers with appropriate resources or teams
4. **Professional Courtesy** - Maintain warm, professional communication
5. **Clear Direction** - Provide specific actions the customer can take
6. **Appropriate Escalation** - Know when to involve specialists

**Response Framework:**
- Warm greeting and acknowledgment of the inquiry
- Clear understanding of what the customer needs
- Practical solutions or resource recommendations
- Specific next steps or actions for the customer
- Contact information for further assistance if needed
- Professional closing with availability assurance

**When to Escalate:**
- Technical issues requiring specialist knowledge
- Policy decisions beyond your authority
- Complex system problems
- Urgent business-critical issues

Generate responses that are helpful, professional, and customer-focused.`;
  }

  private buildUserContent(input: GeneralHandlerInput): string {
    return `Please generate a professional customer service response for this general inquiry:

**Issue Summary**: ${input.issue_summary}
**Customer Message**: ${input.comment_content}
**Reporter**: ${input.metadata.reporter}
**Classification Notes**: ${input.classification_notes}
**Issue Category**: ${input.metadata.classification_category}

Generate a response that:
1. Shows understanding and empathy for the customer's situation
2. Provides helpful information or resources
3. Gives clear, actionable next steps
4. Uses warm, professional language in Traditional Chinese
5. Offers appropriate escalation or specialist referral if needed
6. Maintains excellent customer service standards
7. Provides specific contact information for follow-up

The response should be complete, customer-focused, and professionally supportive.`;
  }
}