import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './utils/config';
import {
  globalErrorHandler,
  notFoundHandler,
  requestIdMiddleware
} from './middleware/errorHandler';
import { validateRequestSize } from './middleware/validation';
import jiraRoutes from './routes/jira';

class JiraCSServerApp {
  private app: express.Application;
  private server: any;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000', 10);

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // 安全性中間件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS 配置
    this.app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // 請求日志
    const logFormat = config.app.nodeEnv === 'production'
      ? 'combined'
      : ':method :url :status :response-time ms - :res[content-length]';

    this.app.use(morgan(logFormat));

    // 基本中間件
    this.app.use(requestIdMiddleware);
    this.app.use(validateRequestSize);
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // 信任代理（如果在負載均衡器後面）
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // 健康檢查路由（不需要前綴）
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          service: 'JiraCSServer',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        },
        timestamp: new Date().toISOString()
      });
    });

    // API 路由
    this.app.use('/api/jira', jiraRoutes);

    // 根路由 - API 文檔
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        data: {
          service: 'JiraCSServer API',
          version: '1.0.0',
          description: 'Multi-Agent Jira Customer Service Workflow System',
          documentation: {
            endpoints: {
              'POST /api/jira/process': 'Process single Jira issue',
              'POST /api/jira/batch': 'Process multiple Jira issues in batch',
              'GET /api/jira/status/:workflowId': 'Get workflow processing status',
              'GET /api/jira/health': 'Detailed system health check',
              'GET /api/jira/info': 'System information and limits',
              'GET /health': 'Basic health check',
              'GET /': 'This API documentation'
            },
            example_request: {
              url: '/api/jira/process',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: {
                forms: {
                  'Project ID': 'JCSC-1',
                  'Issue Type': 'Support Request',
                  'Reporter': 'USER.NAME',
                  'Created': '2025/9/24 10:15',
                  'Updated': '2025/9/24 10:15',
                  'Summary': '無法登入Jira系統',
                  'Comment': {
                    'Created': '2025/9/24 10:15',
                    'Updated': '2025/9/24 10:15',
                    'Content': '我嘗試用我的公司帳號密碼登入，但系統一直提示錯誤...'
                  }
                }
              }
            }
          },
          config: {
            test_mode: config.app.testMode,
            environment: config.app.nodeEnv,
            limits: {
              request_size: '1MB',
              rate_limits: {
                single_process: '20/minute',
                batch_process: '5/minute',
                status_query: '100/minute'
              }
            }
          }
        },
        timestamp: new Date().toISOString()
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 處理
    this.app.use(notFoundHandler);

    // 全域錯誤處理
    this.app.use(globalErrorHandler);
  }

  public async start(): Promise<void> {
    try {
      // 驗證配置
      validateConfig();
      console.log('✅ Configuration validated');

      // 啟動服務器
      this.server = this.app.listen(this.port, () => {
        console.log(`
🚀 JiraCSServer is running!

🌐 Server Details:
   - URL: http://localhost:${this.port}
   - Environment: ${config.app.nodeEnv}
   - Test Mode: ${config.app.testMode}

📡 API Endpoints:
   - POST /api/jira/process     (單一工單處理)
   - POST /api/jira/batch       (批量工單處理)
   - GET  /api/jira/health      (系統健康檢查)
   - GET  /api/jira/info        (系統信息)
   - GET  /health               (基本健康檢查)
   - GET  /                     (API文檔)

⚡ Ready to process Jira customer service requests!
        `);
      });

      // 優雅關機處理
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);

      if (this.server) {
        this.server.close((err: any) => {
          if (err) {
            console.error('❌ Error during server shutdown:', err);
            process.exit(1);
          }

          console.log('✅ Server closed successfully');
          console.log('👋 JiraCSServer shutdown complete');
          process.exit(0);
        });

        // 強制關機超時
        setTimeout(() => {
          console.error('⚠️ Graceful shutdown timeout, forcing exit...');
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    // 監聽關機信號
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // 監聽未捕獲的異常
    process.on('unhandledRejection', (reason, promise) => {
      console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    process.on('uncaughtException', (error) => {
      console.error('🚨 Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close();
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// 創建並導出服務器實例
export const serverApp = new JiraCSServerApp();

// 如果直接運行此文件，啟動服務器
if (require.main === module) {
  serverApp.start().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export default JiraCSServerApp;