import OpenAI from 'openai';
import { config } from '../utils/config';
import { QualityAssessment, QualityAssessmentSchema, ProcessingStep } from '../types';
import { WorkflowStateAnnotation } from '../workflow/state';

export class QualityEvaluatorAgent {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });
  }

  async evaluate(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<Partial<typeof WorkflowStateAnnotation.State>> {
    const startTime = Date.now();

    try {
      if (!state.current_response) {
        throw new Error('No response to evaluate');
      }

      const assessment = await this.performQualityAssessment(state);
      const processingTime = Date.now() - startTime;

      const processingStep: ProcessingStep = {
        step_name: 'quality_evaluation',
        agent_name: 'QualityEvaluatorAgent',
        timestamp: new Date().toISOString(),
        input: {
          response_content: state.current_response,
          original_request: state.original_request,
          classification: state.classification,
        },
        output: {
          confidence: assessment.score / 100,
          suggested_action: assessment.requires_improvement ? 'improve_response' : 'finalize_response',
          response_content: assessment.feedback,
          metadata: {
            quality_criteria: assessment.criteria,
            improvement_suggestions: assessment.improvement_suggestions,
          },
          processing_time: processingTime,
        },
        success: true,
      };

      return {
        quality_assessment: assessment,
        quality_score: assessment.score,
        quality_feedback: assessment.feedback,
        processing_history: [processingStep],
        current_agent: 'QualityEvaluatorAgent',
        next_action: assessment.requires_improvement ? 'improve_response' : 'finalize_response',
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorStep: ProcessingStep = {
        step_name: 'quality_evaluation',
        agent_name: 'QualityEvaluatorAgent',
        timestamp: new Date().toISOString(),
        input: {
          response_content: state.current_response || '',
        },
        output: {
          confidence: 0,
          suggested_action: 'retry_quality_evaluation',
          response_content: 'Quality evaluation failed',
          metadata: {},
          processing_time: processingTime,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        processing_history: [errorStep],
        error_message: `Quality evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        has_error: true,
      };
    }
  }

  private async performQualityAssessment(
    state: typeof WorkflowStateAnnotation.State
  ): Promise<QualityAssessment> {
    const systemPrompt = this.buildEvaluationPrompt();
    const userContent = this.buildEvaluationContent(state);

    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'quality_assessment',
          schema: QualityAssessmentSchema,
        },
      },
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No quality assessment received from OpenAI');
    }

    return JSON.parse(result) as QualityAssessment;
  }

  private buildEvaluationPrompt(): string {
    return `You are a quality assurance specialist for customer service responses. Your role is to evaluate the quality of responses to Jira support tickets using professional customer service standards.

**Evaluation Criteria (0-100 scale for each):**

1. **Relevance (25% weight)**: How well does the response address the specific issue raised?
   - Does it directly address the customer's problem?
   - Are the solutions appropriate for the issue type?
   - Is the response focused and on-topic?

2. **Completeness (25% weight)**: Does the response provide comprehensive assistance?
   - Are all aspects of the customer's issue addressed?
   - Are step-by-step instructions provided where needed?
   - Are alternative solutions offered when appropriate?

3. **Tone (20% weight)**: Is the communication professional and customer-friendly?
   - Is the tone empathetic and understanding?
   - Is the language professional but approachable?
   - Does it maintain appropriate formality for business communication?

4. **Actionability (20% weight)**: Can the customer easily follow the provided guidance?
   - Are instructions clear and specific?
   - Are next steps clearly defined?
   - Are resources and contacts provided when needed?

5. **Accuracy (10% weight)**: Is the information technically correct and up-to-date?
   - Are technical procedures accurate?
   - Are links and references appropriate?
   - Is the information consistent with best practices?

**Quality Thresholds:**
- 90-100: Excellent - Ready to send
- 75-89: Good - Minor improvements may help
- 60-74: Acceptable - Some improvements needed
- Below 60: Needs significant improvement before sending

**Assessment Requirements:**
- Provide overall score (0-100)
- Score each criterion individually
- Give specific feedback on strengths and weaknesses
- Determine if improvement is required (< 75 overall score)
- Provide actionable improvement suggestions

Be thorough but practical in your evaluation. Focus on what would make the response most helpful to the customer.`;
  }

  private buildEvaluationContent(state: typeof WorkflowStateAnnotation.State): string {
    const originalRequest = state.original_request;
    const classification = state.classification;
    const response = state.current_response;

    return `Please evaluate the quality of this customer service response:

**ORIGINAL CUSTOMER REQUEST:**
Summary: ${originalRequest.forms.Summary}
Comment: ${originalRequest.forms.Comment.Content}
Reporter: ${originalRequest.forms.Reporter}
Issue Type: ${originalRequest.forms["Issue Type"]}

**CLASSIFICATION:**
Category: ${classification?.category || 'Unknown'}
Confidence: ${classification?.confidence || 'N/A'}
Reasoning: ${classification?.reasoning || 'N/A'}

**RESPONSE TO EVALUATE:**
${response}

**CONTEXT:**
This is a ${classification?.category || 'general'} support issue. The response was generated by an AI agent specialized in handling this type of issue.

Please provide a comprehensive quality assessment including:
1. Overall quality score (0-100)
2. Individual scores for each criterion
3. Specific feedback on what works well
4. Areas that need improvement
5. Whether the response requires improvement before sending
6. Specific suggestions for improvement if needed

Consider the customer's perspective: Would this response be helpful, clear, and satisfactory?`;
  }

  // Helper method to determine if response needs improvement
  static needsImprovement(assessment: QualityAssessment): boolean {
    return assessment.requires_improvement || assessment.score < 75;
  }

  // Helper method to get quality summary
  static getQualitySummary(assessment: QualityAssessment): string {
    if (assessment.score >= 90) return 'Excellent';
    if (assessment.score >= 75) return 'Good';
    if (assessment.score >= 60) return 'Acceptable';
    return 'Needs Improvement';
  }
}