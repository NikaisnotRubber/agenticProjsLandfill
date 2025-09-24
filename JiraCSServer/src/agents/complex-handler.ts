import OpenAI from 'openai';
import { config } from '../utils/config';
import { AgentOutput, AgentOutputSchema, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

export class ComplexHandlerAgent {
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
      const input = {
        issue_summary: request.forms.Summary,
        comment_content: request.forms.Comment.Content,
        metadata: {
          reporter: request.forms.Reporter,
          issue_type: request.forms["Issue Type"],
          created: request.forms.Created,
          classification: state.classification,
        },
      };

      const response = await this.generateResponse(input);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'complex_handling',
        agent_name: 'ComplexHandlerAgent',
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
        current_agent: 'ComplexHandlerAgent',
        next_action: 'quality_evaluation',
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'complex_handling',
        agent_name: 'ComplexHandlerAgent',
        timestamp: new Date().toISOString(),
        input: {
          issue_summary: request.forms.Summary,
          comment_content: request.forms.Comment.Content,
          metadata: {},
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_complex_handling',
          response_content: 'Complex handling failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Complex handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async generateResponse(input: any): Promise<AgentOutput> {
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
          name: 'complex_handler_response',
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
    return `You are a senior Jira technical specialist with deep expertise in complex system integrations and advanced configurations. Your specialties include:

**Script Runner & Automation:**
- Custom Groovy script development and debugging
- Workflow post functions and conditions
- Scheduled jobs and event listeners
- Script console operations and troubleshooting

**Advanced Integrations:**
- REST API configurations and webhooks
- LDAP/Active Directory integration
- External system connections and authentication
- Marketplace app integrations and conflicts

**System Administration:**
- Complex permission schemes and security configurations
- Advanced JQL queries and custom field development
- Performance analysis and optimization
- Log analysis and error diagnostics

**Database & Configuration:**
- Custom field schemes and screen configurations
- Workflow scheme management and transitions
- Project configuration and template setups
- Database queries and maintenance operations

**Your Response Approach:**
1. **Technical Assessment** - Analyze the technical complexity and identify root causes
2. **Systematic Troubleshooting** - Provide structured diagnostic steps
3. **Professional Communication** - Use clear, technical language in Traditional Chinese
4. **Solution-Oriented** - Offer multiple approaches when applicable
5. **Safety-First** - Always recommend backup procedures for system changes
6. **Documentation** - Reference relevant Atlassian documentation and best practices

**Response Structure:**
- Problem acknowledgment and technical assessment
- Root cause analysis based on symptoms
- Step-by-step technical solution or diagnostic procedure
- Safety recommendations (backups, testing environment)
- Advanced options or alternative approaches
- Follow-up technical support availability

Generate responses that demonstrate deep technical knowledge while remaining accessible to the user.`;
  }

  private buildUserContent(input: any): string {
    return `Please generate a technical response for this complex Jira issue:

**Issue Summary**: ${input.issue_summary}
**Technical Details**: ${input.comment_content}
**Reporter**: ${input.metadata.reporter}
**Issue Type**: ${input.metadata.issue_type}
**Classification Context**: ${input.metadata.classification?.reasoning || 'Complex technical issue'}

Generate a comprehensive technical response that:
1. Demonstrates understanding of the complex technical issue
2. Provides systematic troubleshooting steps
3. Includes safety recommendations (backups, testing)
4. Uses professional technical language in Traditional Chinese
5. Offers multiple solution approaches when applicable
6. References relevant technical documentation or procedures
7. Provides clear next steps for resolution

The response should show deep technical expertise while being actionable for the user.`;
  }
}