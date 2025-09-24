import axios, { AxiosResponse, AxiosError } from 'axios';
import { mockJiraIssues } from './mock-data';
import { JiraIssueInput } from '../types';

// API測試配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30秒超時

class ApiTestRunner {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting JiraCSServer API Tests');
    console.log('==================================');
    console.log(`🌐 Base URL: ${this.baseURL}`);
    console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms\n`);

    try {
      // 基本連接測試
      await this.testConnection();

      // 健康檢查測試
      await this.testHealthCheck();

      // 系統信息測試
      await this.testSystemInfo();

      // 請求驗證測試
      await this.testValidation();

      // 單一工單處理測試
      await this.testSingleIssueProcessing();

      // 批量處理測試
      await this.testBatchProcessing();

      // 錯誤處理測試
      await this.testErrorHandling();

      // 速率限制測試
      await this.testRateLimit();

      console.log('\n✅ All API tests completed successfully!');
    } catch (error) {
      console.error('\n❌ API test suite failed:', error);
      process.exit(1);
    }
  }

  private async testConnection(): Promise<void> {
    console.log('🔌 Testing API Connection...');

    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 5000
      });

      if (response.status === 200 && response.data.success) {
        console.log('✅ API connection successful');
        console.log(`   Status: ${response.data.data.status}`);
        console.log(`   Service: ${response.data.data.service}`);
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.log('⚠️ API server is not running. Please start the server first:');
          console.log('   npm run server:dev');
          process.exit(1);
        }
      }
      throw error;
    }
  }

  private async testHealthCheck(): Promise<void> {
    console.log('\n🏥 Testing Health Check Endpoint...');

    try {
      const response = await axios.get(`${this.baseURL}/api/jira/health`, {
        timeout: 10000
      });

      console.log(`   Status: ${response.status}`);
      console.log(`   Health: ${response.data.data.status}`);
      console.log(`   Components: ${JSON.stringify(response.data.data.components)}`);

      if (response.data.data.status !== 'healthy') {
        console.log('⚠️ System health check shows unhealthy status');
      } else {
        console.log('✅ Health check passed');
      }
    } catch (error) {
      console.log('❌ Health check failed:', this.getErrorMessage(error));
    }
  }

  private async testSystemInfo(): Promise<void> {
    console.log('\n📋 Testing System Info Endpoint...');

    try {
      const response = await axios.get(`${this.baseURL}/api/jira/info`);

      console.log(`   Service: ${response.data.data.service}`);
      console.log(`   Version: ${response.data.data.version}`);
      console.log(`   Rate Limits:`, response.data.data.limits);
      console.log('✅ System info retrieved successfully');
    } catch (error) {
      console.log('❌ System info failed:', this.getErrorMessage(error));
    }
  }

  private async testValidation(): Promise<void> {
    console.log('\n✅ Testing Request Validation...');

    // 測試無效的JSON結構
    const invalidRequests = [
      {
        name: 'Missing forms field',
        data: { invalid: 'data' },
        expectedStatus: 400
      },
      {
        name: 'Invalid Project ID format',
        data: {
          forms: {
            ...mockJiraIssues[0].forms,
            'Project ID': 'INVALID_FORMAT'
          }
        },
        expectedStatus: 400
      },
      {
        name: 'Missing Comment Content',
        data: {
          forms: {
            ...mockJiraIssues[0].forms,
            Comment: {
              Created: '2025/9/24 10:15',
              Updated: '2025/9/24 10:15',
              // Content missing
            }
          }
        },
        expectedStatus: 400
      },
      {
        name: 'Invalid date format',
        data: {
          forms: {
            ...mockJiraIssues[0].forms,
            Created: 'invalid-date'
          }
        },
        expectedStatus: 400
      }
    ];

    for (const testCase of invalidRequests) {
      try {
        console.log(`   🔍 Testing: ${testCase.name}`);

        const response = await axios.post(
          `${this.baseURL}/api/jira/process`,
          testCase.data,
          { timeout: 5000 }
        );

        if (response.status !== testCase.expectedStatus) {
          console.log(`   ⚠️  Expected status ${testCase.expectedStatus}, got ${response.status}`);
        } else {
          console.log(`   ✅ Validation correctly rejected: ${testCase.name}`);
        }
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === testCase.expectedStatus) {
          console.log(`   ✅ Validation correctly rejected: ${testCase.name}`);
        } else {
          console.log(`   ❌ Unexpected error for ${testCase.name}:`, this.getErrorMessage(error));
        }
      }
    }
  }

  private async testSingleIssueProcessing(): Promise<void> {
    console.log('\n🎯 Testing Single Issue Processing...');

    const testIssue = mockJiraIssues[0]; // 使用登入問題測試

    try {
      console.log(`   📝 Processing: ${testIssue.forms.Summary}`);

      const startTime = Date.now();
      const response = await axios.post(
        `${this.baseURL}/api/jira/process`,
        testIssue,
        { timeout: TEST_TIMEOUT }
      );

      const processingTime = Date.now() - startTime;

      console.log(`   ⏱️  API Response Time: ${processingTime}ms`);
      console.log(`   📊 Status: ${response.status}`);

      if (response.data.success) {
        const data = response.data.data;
        console.log(`   🔑 Issue Key: ${data.issue_key}`);
        console.log(`   📝 Source: "${data.Source}"`);
        console.log(`   💬 Response Length: ${data.comment_content.length} chars`);
        console.log(`   🤖 Classification: ${data.classification?.category}`);
        console.log(`   ⭐ Quality Score: ${data.quality_score}`);
        console.log(`   🔄 Processing Steps: ${data.processing_steps?.length}`);
        console.log('✅ Single issue processing successful');
      } else {
        console.log('❌ Single issue processing failed');
        console.log(`   Error: ${response.data.error}`);
      }
    } catch (error) {
      console.log('❌ Single issue processing error:', this.getErrorMessage(error));
    }
  }

  private async testBatchProcessing(): Promise<void> {
    console.log('\n📦 Testing Batch Processing...');

    const batchIssues = mockJiraIssues.slice(0, 3); // 測試前3個工單

    // 測試順序處理
    console.log('   🔄 Testing sequential processing...');
    try {
      const response = await axios.post(
        `${this.baseURL}/api/jira/batch`,
        {
          issues: batchIssues,
          options: { parallel: false, timeout: TEST_TIMEOUT }
        },
        { timeout: TEST_TIMEOUT * 2 }
      );

      if (response.data.success) {
        const summary = response.data.data.summary;
        console.log(`   📊 Batch Results: ${summary.successful}/${summary.total} successful`);
        console.log(`   ⏱️  Total Processing Time: ${summary.processing_time}ms`);
        console.log('✅ Sequential batch processing successful');
      } else {
        console.log('❌ Sequential batch processing failed');
      }
    } catch (error) {
      console.log('❌ Sequential batch processing error:', this.getErrorMessage(error));
    }

    // 測試並行處理
    console.log('   ⚡ Testing parallel processing...');
    try {
      const response = await axios.post(
        `${this.baseURL}/api/jira/batch`,
        {
          issues: batchIssues,
          options: { parallel: true, timeout: TEST_TIMEOUT }
        },
        { timeout: TEST_TIMEOUT * 2 }
      );

      if (response.data.success) {
        const summary = response.data.data.summary;
        console.log(`   📊 Batch Results: ${summary.successful}/${summary.total} successful`);
        console.log(`   ⏱️  Total Processing Time: ${summary.processing_time}ms`);
        console.log('✅ Parallel batch processing successful');
      } else {
        console.log('❌ Parallel batch processing failed');
      }
    } catch (error) {
      console.log('❌ Parallel batch processing error:', this.getErrorMessage(error));
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n🚨 Testing Error Handling...');

    // 測試404錯誤
    try {
      await axios.get(`${this.baseURL}/api/nonexistent`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('✅ 404 error handling works correctly');
      } else {
        console.log('❌ Unexpected 404 error response');
      }
    }

    // 測試大請求
    try {
      const largeContent = 'A'.repeat(100000); // 100KB的內容
      const largeIssue = {
        ...mockJiraIssues[0],
        forms: {
          ...mockJiraIssues[0].forms,
          Comment: {
            ...mockJiraIssues[0].forms.Comment,
            Content: largeContent
          }
        }
      };

      await axios.post(`${this.baseURL}/api/jira/process`, largeIssue);
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 413 || error.response?.status === 400)) {
        console.log('✅ Large request handling works correctly');
      } else {
        console.log('❌ Unexpected large request error response');
      }
    }
  }

  private async testRateLimit(): Promise<void> {
    console.log('\n⏱️  Testing Rate Limits...');

    // 這裡我們只測試幾個請求，不觸發實際的速率限制
    const requests = Array(3).fill(null).map(() =>
      axios.get(`${this.baseURL}/api/jira/info`, { timeout: 5000 })
    );

    try {
      const results = await Promise.all(requests);
      console.log(`   ✅ Made ${results.length} requests successfully`);
      console.log('   📝 Note: Actual rate limit testing requires more requests');
    } catch (error) {
      console.log('❌ Rate limit test error:', this.getErrorMessage(error));
    }
  }

  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return `${error.response?.status || 'Unknown'} - ${error.response?.data?.error || error.message}`;
    }
    return error instanceof Error ? error.message : String(error);
  }

  async testApiDocumentation(): Promise<void> {
    console.log('\n📚 Testing API Documentation...');

    try {
      const response = await axios.get(this.baseURL);

      if (response.data.success && response.data.data.documentation) {
        console.log('✅ API documentation endpoint works');
        console.log('   Available endpoints:');
        Object.keys(response.data.data.documentation.endpoints).forEach(endpoint => {
          console.log(`   - ${endpoint}`);
        });
      }
    } catch (error) {
      console.log('❌ API documentation test failed:', this.getErrorMessage(error));
    }
  }
}

// 執行測試
async function main() {
  const testRunner = new ApiTestRunner();

  // 等待一下確保服務器啟動
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testRunner.runAllTests();
  await testRunner.testApiDocumentation();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ API test runner failed:', error);
    process.exit(1);
  });
}

export default ApiTestRunner;