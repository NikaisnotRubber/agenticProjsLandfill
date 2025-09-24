import { Request, Response, NextFunction } from 'express';
import { config } from '../utils/config';

// API 錯誤類別
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 標準化 API 回應格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  processingTime?: number;
}

// 成功回應幫助函數
export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

// 錯誤回應幫助函數
export function errorResponse(message: string, details?: any, statusCode?: number): ApiResponse {
  return {
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
  };
}

// 全域錯誤處理中間件
export function globalErrorHandler(
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = req.startTime;
  const processingTime = startTime ? Date.now() - startTime : undefined;

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // 處理不同類型的錯誤
  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    statusCode = 400;
    message = 'Invalid JSON format';
  } else if (error.message.includes('timeout')) {
    statusCode = 408;
    message = 'Request Timeout';
  } else if (error.message.includes('rate limit')) {
    statusCode = 429;
    message = 'Rate Limit Exceeded';
  }

  // 記錄錯誤
  console.error('API Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    statusCode,
    message,
    details,
    stack: config.app.nodeEnv === 'development' ? error.stack : undefined,
    requestId: req.requestId,
    processingTime,
  });

  // 建構回應
  const response: ApiResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    processingTime,
  };

  // 在開發環境中包含更多詳細信息
  if (config.app.nodeEnv === 'development') {
    response.details = details || error.message;
    if (error.stack) {
      response.details = {
        ...response.details,
        stack: error.stack.split('\n').slice(0, 10), // 限制堆疊深度
      };
    }
  } else {
    // 生產環境中只顯示安全的詳細信息
    if (statusCode < 500) {
      response.details = details;
    }
  }

  res.status(statusCode).json(response);
}

// 404 處理中間件
export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    error: 'Not Found',
    details: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  };

  res.status(404).json(response);
}

// 請求 ID 生成中間件
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', req.requestId);
  next();
}

// 非同步錯誤捕獲包裝器
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// 常用的 API 錯誤
export class BadRequestError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, true);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, true);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found') {
    super(message, 404, true);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 409, true, details);
  }
}

export class UnprocessableEntityError extends ApiError {
  constructor(message: string, details?: any) {
    super(message, 422, true, details);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message: string = 'Too Many Requests', retryAfter?: number) {
    super(message, 429, true, { retryAfter });
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error', details?: any) {
    super(message, 500, true, details);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message: string = 'Service Unavailable') {
    super(message, 503, true);
  }
}

export class TimeoutError extends ApiError {
  constructor(message: string = 'Request Timeout') {
    super(message, 408, true);
  }
}