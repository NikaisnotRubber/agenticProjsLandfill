import express from 'express';
import {
  validateJiraIssue,
  validateBatchProcess,
  validateBusinessRules,
  rateLimit
} from '../middleware/validation';
import {
  asyncHandler,
  successResponse,
  errorResponse,
  BadRequestError,
  InternalServerError,
  TimeoutError
} from '../middleware/errorHandler';
import { JiraWorkflowOrchestrator } from '../workflow/orchestrator';
import { JiraIssueInput, JiraResponse } from '../types';

const router = express.Router();
const orchestrator = new JiraWorkflowOrchestrator();

// 單一工單處理端點
router.post('/process',
  rateLimit(20, 60000), // 每分鐘20次請求限制
  validateJiraIssue,
  validateBusinessRules,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const issue: JiraIssueInput = req.body;

    console.log(`🌐 API Request: Processing issue ${issue.forms["Project ID"]} from ${req.ip}`);

    try {
      // 處理工單
      const result = await orchestrator.processRequest(issue);
      const processingTime = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ API Success: Issue ${issue.forms["Project ID"]} processed in ${processingTime}ms`);

        // 成功回應
        const response = successResponse({
          issue_key: result.result.final_output.issue_key,
          Source: result.result.final_output.Source,
          comment_content: result.result.final_output.comment_content,
          workflow_id: result.workflow_id,
          processing_time: result.processing_time,
          classification: result.result.classification,
          quality_score: result.result.quality_score,
          processing_steps: result.result.processing_history?.map((step: any) => ({
            agent: step.agent_name,
            step: step.step_name,
            success: step.success,
            processing_time: step.output.processing_time
          }))
        });

        res.status(200).json(response);
      } else {
        console.log(`❌ API Error: Issue ${issue.forms["Project ID"]} failed: ${result.error}`);

        throw new InternalServerError(
          'Workflow processing failed',
          {
            workflow_id: result.workflow_id,
            error: result.error,
            processing_time: result.processing_time
          }
        );
      }
    } catch (error) {
      console.error(`💥 API Exception: Issue ${issue.forms["Project ID"]}:`, error);

      if (error instanceof Error && error.message.includes('timeout')) {
        throw new TimeoutError('Processing timeout exceeded');
      }

      throw error;
    }
  })
);

// 批量處理端點
router.post('/batch',
  rateLimit(5, 60000), // 每分鐘5次批量請求限制
  validateBatchProcess,
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { issues, options } = req.body;
    const startTime = Date.now();

    console.log(`🌐 API Batch Request: Processing ${issues.length} issues from ${req.ip}`);

    try {
      let results;

      if (options.parallel) {
        // 並行處理
        console.log('🔄 Processing issues in parallel...');
        const promises = issues.map((issue: JiraIssueInput) =>
          orchestrator.processRequest(issue).catch(error => ({
            success: false,
            error: error.message,
            workflow_id: `error-${Date.now()}`,
            processing_time: 0
          }))
        );

        results = await Promise.all(promises);
      } else {
        // 順序處理
        console.log('🔄 Processing issues sequentially...');
        results = [];

        for (const issue of issues) {
          try {
            const result = await orchestrator.processRequest(issue);
            results.push(result);
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              workflow_id: `error-${Date.now()}`,
              processing_time: 0
            });
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;

      console.log(`📊 Batch Complete: ${successful} success, ${failed} failed in ${processingTime}ms`);

      // 組織回應
      const response = successResponse({
        summary: {
          total: results.length,
          successful,
          failed,
          processing_time: processingTime
        },
        results: results.map((result, index) => ({
          index,
          issue_key: issues[index].forms["Project ID"],
          success: result.success,
          workflow_id: result.workflow_id,
          processing_time: result.processing_time,
          data: result.success ? {
            issue_key: result.result?.final_output?.issue_key,
            Source: result.result?.final_output?.Source,
            comment_content: result.result?.final_output?.comment_content,
            classification: result.result?.classification?.category,
            quality_score: result.result?.quality_score
          } : null,
          error: result.success ? null : result.error
        }))
      });

      res.status(200).json(response);

    } catch (error) {
      console.error('💥 API Batch Exception:', error);
      throw new InternalServerError('Batch processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

// 工作流狀態查詢端點
router.get('/status/:workflowId',
  rateLimit(100, 60000), // 每分鐘100次狀態查詢
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const { workflowId } = req.params;

    // 這裡通常會從數據庫或緩存中查詢狀態
    // 目前返回模擬狀態
    const response = successResponse({
      workflow_id: workflowId,
      status: 'completed', // 可能的狀態: pending, processing, completed, failed
      timestamp: new Date().toISOString(),
      message: 'Workflow status query not implemented yet'
    });

    res.status(200).json(response);
  })
);

// 健康檢查端點
router.get('/health',
  asyncHandler(async (req: express.Request, res: express.Response) => {
    try {
      const health = await orchestrator.healthCheck();

      const response = successResponse({
        status: health.status,
        components: health.components,
        timestamp: health.timestamp,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      });

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      throw new InternalServerError('Health check failed');
    }
  })
);

// 系統信息端點
router.get('/info',
  rateLimit(50, 60000), // 每分鐘50次信息查詢
  asyncHandler(async (req: express.Request, res: express.Response) => {
    const response = successResponse({
      service: 'JiraCSServer',
      version: '1.0.0',
      description: 'Jira Customer Service Agent Workflow System',
      endpoints: {
        process: 'POST /api/jira/process - Process single Jira issue',
        batch: 'POST /api/jira/batch - Process multiple issues',
        status: 'GET /api/jira/status/:workflowId - Get workflow status',
        health: 'GET /api/jira/health - System health check',
        info: 'GET /api/jira/info - System information'
      },
      limits: {
        single_requests_per_minute: 20,
        batch_requests_per_minute: 5,
        max_issues_per_batch: 10,
        max_request_size: '1MB'
      }
    });

    res.status(200).json(response);
  })
);

export default router;