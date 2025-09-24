import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { JiraIssueInput } from '../types';

// Jira Issue Input 驗證結構
const jiraIssueSchema = Joi.object({
  forms: Joi.object({
    'Project ID': Joi.string().required().trim().min(1).max(50)
      .pattern(/^[A-Z]+-\d+$/)
      .message('Project ID must be in format like "JCSC-1"'),

    'Issue Type': Joi.string().required().trim().min(1).max(100),

    'Reporter': Joi.string().required().trim().min(1).max(100),

    'Created': Joi.string().required().trim()
      .pattern(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/)
      .message('Created must be in format "YYYY/M/D H:MM"'),

    'Updated': Joi.string().required().trim()
      .pattern(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/)
      .message('Updated must be in format "YYYY/M/D H:MM"'),

    'Summary': Joi.string().required().trim().min(1).max(500),

    'Comment': Joi.object({
      'Created': Joi.string().required().trim()
        .pattern(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/)
        .message('Comment Created must be in format "YYYY/M/D H:MM"'),

      'Updated': Joi.string().required().trim()
        .pattern(/^\d{4}\/\d{1,2}\/\d{1,2} \d{1,2}:\d{2}$/)
        .message('Comment Updated must be in format "YYYY/M/D H:MM"'),

      'Content': Joi.string().required().trim().min(1).max(5000)
        .message('Comment Content is required and must be between 1-5000 characters')
    }).required()
  }).required()
});

// 批量處理的驗證結構
const batchProcessSchema = Joi.object({
  issues: Joi.array().items(jiraIssueSchema).min(1).max(10).required()
    .messages({
      'array.min': 'Issues array must contain at least 1 issue',
      'array.max': 'Issues array cannot contain more than 10 issues',
      'any.required': 'Issues array is required'
    }),

  options: Joi.object({
    parallel: Joi.boolean().default(false),
    timeout: Joi.number().integer().min(1000).max(300000).default(60000),
    retry: Joi.boolean().default(true)
  }).default({})
});

// 通用驗證中間件
export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // 顯示所有錯誤
      stripUnknown: true, // 移除未知字段
      convert: true // 自動類型轉換
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    // 將驗證後的數據設置到 req.body
    req.body = value;
    next();
  };
}

// 特定的驗證中間件
export const validateJiraIssue = validateRequest(jiraIssueSchema);
export const validateBatchProcess = validateRequest(batchProcessSchema);

// 額外的業務邏輯驗證
export function validateBusinessRules(req: Request, res: Response, next: NextFunction) {
  try {
    const issue = req.body as JiraIssueInput;
    const errors: string[] = [];

    // 檢查日期邏輯
    const created = new Date(issue.forms.Created.replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)/, '$3-$1-$2 $4'));
    const updated = new Date(issue.forms.Updated.replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)/, '$3-$1-$2 $4'));

    if (updated < created) {
      errors.push('Updated time cannot be earlier than Created time');
    }

    // 檢查Comment日期
    const commentCreated = new Date(issue.forms.Comment.Created.replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)/, '$3-$1-$2 $4'));
    const commentUpdated = new Date(issue.forms.Comment.Updated.replace(/(\d+)\/(\d+)\/(\d+) (\d+:\d+)/, '$3-$1-$2 $4'));

    if (commentUpdated < commentCreated) {
      errors.push('Comment Updated time cannot be earlier than Comment Created time');
    }

    if (commentCreated < created) {
      errors.push('Comment Created time cannot be earlier than Issue Created time');
    }

    // 檢查內容質量
    if (issue.forms.Summary.trim() === issue.forms.Comment.Content.trim()) {
      errors.push('Summary and Comment Content should not be identical');
    }

    // 檢查是否包含敏感信息
    const sensitivePatterns = [
      /password\s*[:=]\s*\S+/i,
      /pwd\s*[:=]\s*\S+/i,
      /token\s*[:=]\s*\S+/i,
      /key\s*[:=]\s*\S+/i
    ];

    const allContent = `${issue.forms.Summary} ${issue.forms.Comment.Content}`;
    const hasSensitiveInfo = sensitivePatterns.some(pattern => pattern.test(allContent));

    if (hasSensitiveInfo) {
      errors.push('Request contains potentially sensitive information (password, token, etc.)');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Business rule validation failed',
        details: errors,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Date parsing error',
      details: ['Invalid date format in one or more date fields'],
      timestamp: new Date().toISOString()
    });
  }
}

// 速率限制中間件 (簡單版本)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(maxRequests: number = 10, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const clientData = requestCounts.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
      // 新客戶端或重置窗口
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        details: [`Rate limit exceeded. Max ${maxRequests} requests per ${windowMs/1000} seconds.`],
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    clientData.count++;
    next();
  };
}

// 請求大小限制檢查
export function validateRequestSize(req: Request, res: Response, next: NextFunction) {
  const contentLength = req.get('content-length');
  const maxSize = 1024 * 1024; // 1MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request too large',
      details: [`Request size ${contentLength} bytes exceeds limit of ${maxSize} bytes`],
      timestamp: new Date().toISOString()
    });
  }

  next();
}

// 導出所有驗證結構供測試使用
export { jiraIssueSchema, batchProcessSchema };