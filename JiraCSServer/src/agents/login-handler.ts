import OpenAI from 'openai';
import { config } from '../utils/config';
import { AgentOutput, AgentOutputSchema, LoginHandlerInput, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

export class LoginHandlerAgent {
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
      const input: LoginHandlerInput = {
        issue_summary: request.forms.Summary,
        comment_content: request.forms.Comment.Content,
        metadata: {
          reporter: request.forms.Reporter,
          issue_type: request.forms["Issue Type"],
          created: request.forms.Created,
        },
      };

      const response = await this.generateResponse(input);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'login_handling',
        agent_name: 'LoginHandlerAgent',
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
        current_agent: 'LoginHandlerAgent',
        next_action: 'quality_evaluation',
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'login_handling',
        agent_name: 'LoginHandlerAgent',
        timestamp: new Date().toISOString(),
        input: {
          issue_summary: request.forms.Summary,
          comment_content: request.forms.Comment.Content,
          metadata: {},
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_login_handling',
          response_content: 'Login handling failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Login handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async generateResponse(input: LoginHandlerInput): Promise<AgentOutput> {
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
          name: 'login_handler_response',
          schema: AgentOutputSchema,
        },
      },
      temperature: 0.3,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response received from OpenAI');
    }

    return JSON.parse(result) as AgentOutput;
  }

  private buildSystemPrompt(): string {
    return `You are a professional Jira customer service specialist focused on login and account-related issues. Your expertise includes:

**Login & Access Issues:**
- Password reset procedures
- Account lockout resolution
- Username/email verification
- Multi-factor authentication problems
- Session timeout issues
- Browser compatibility problems

**Account Management:**
- User provisioning and deprovisioning
- Basic permission assignments
- Profile updates
- Email notification settings

**Your Response Guidelines:**
1. **Be empathetic and professional** - Acknowledge the frustration of being locked out
2. **Provide step-by-step solutions** - Give clear, actionable instructions
3. **Use friendly but professional tone** in Traditional Chinese
4. **Include helpful links** where appropriate (use placeholder URLs)
5. **Offer escalation paths** if the basic solution doesn't work
6. **Be proactive** - mention that you've already checked their account status when applicable

**Response Structure:**
- Greeting and acknowledgment
- Clear problem diagnosis
- Step-by-step solution(s)
- Proactive assistance (account checks, temporary fixes)
- Follow-up instructions
- Closing with support availability

**Common Solutions to Offer:**
1. Self-service password reset
2. Account unlock procedures
3. Browser cache clearing
4. Alternative access methods
5. Temporary account fixes (when applicable)

Generate responses that are helpful, professional, and show that you've taken proactive steps to help resolve the issue.`;
  }

  private buildUserContent(input: LoginHandlerInput): string {
    return `Please generate a professional customer service response for this login-related Jira issue:

**Issue Summary**: ${input.issue_summary}
**Customer Message**: ${input.comment_content}
**Reporter**: ${input.metadata.reporter}
**Issue Type**: ${input.metadata.issue_type}

Generate a response that:
1. Acknowledges the login problem professionally
2. Provides clear, step-by-step solutions
3. Shows proactive assistance (mention account status checks if relevant)
4. Uses a friendly but professional tone in Traditional Chinese
5. Includes relevant links and follow-up instructions
6. Offers escalation if needed

The response should be complete, professional, and ready to send to the customer.`;
  }
}