import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { config } from '../utils/config';
import { JiraResponse, ApiResponse } from '../types';

export class JiraApiClient {
  private client: AxiosInstance;
  private testMode: boolean;

  constructor() {
    this.testMode = config.app.testMode;

    this.client = axios.create({
      baseURL: config.jira.baseUrl,
      timeout: config.jira.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${config.jira.authToken}`,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        if (this.testMode) {
          console.log(`[TEST MODE] Would send request to: ${config.baseURL}${config.url}`);
          console.log(`[TEST MODE] Request data:`, config.data);
        }
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        if (this.testMode) {
          console.log(`[TEST MODE] Mock response status: ${response.status}`);
        }
        return response;
      },
      (error) => {
        console.error('API Error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  async sendResponse(jiraResponse: JiraResponse): Promise<ApiResponse> {
    try {
      // In test mode, simulate a successful response
      if (this.testMode) {
        console.log('[TEST MODE] Simulating Jira API call');
        console.log('[TEST MODE] Response data:', jiraResponse);

        await this.simulateDelay(1000); // Simulate network delay

        return {
          success: true,
          data: {
            message: 'Test mode: Response would be sent to Jira',
            issue_key: jiraResponse.issue_key,
            timestamp: new Date().toISOString(),
          },
          status_code: 200,
        };
      }

      // Make actual API call in production
      const response: AxiosResponse = await this.client.post(
        config.jira.endpoint,
        jiraResponse
      );

      return {
        success: true,
        data: response.data,
        status_code: response.status,
      };
    } catch (error) {
      console.error('Failed to send response to Jira:', error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `HTTP ${error.response?.status}: ${error.response?.statusText}`,
          status_code: error.response?.status,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async testConnection(): Promise<ApiResponse> {
    try {
      if (this.testMode) {
        console.log('[TEST MODE] Simulating connection test');
        await this.simulateDelay(500);
        return {
          success: true,
          data: {
            message: 'Test mode: Connection would be successful',
            timestamp: new Date().toISOString(),
          },
          status_code: 200,
        };
      }

      // Test the connection with a lightweight request
      const response = await this.client.get('/rest/api/2/myself', {
        timeout: 10000,
      });

      return {
        success: true,
        data: {
          message: 'Connection successful',
          user: response.data,
        },
        status_code: response.status,
      };
    } catch (error) {
      console.error('Connection test failed:', error);

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: `Connection test failed: HTTP ${error.response?.status}`,
          status_code: error.response?.status,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown connection error',
      };
    }
  }

  async sendBatchResponses(responses: JiraResponse[]): Promise<ApiResponse[]> {
    const results: ApiResponse[] = [];

    for (const response of responses) {
      try {
        const result = await this.sendResponse(response);
        results.push(result);

        // Add delay between batch requests to avoid rate limiting
        if (!this.testMode) {
          await this.simulateDelay(500);
        }
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Batch send failed',
        });
      }
    }

    return results;
  }

  // Utility methods
  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string; testMode: boolean }> {
    const testResult = await this.testConnection();

    return {
      status: testResult.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      testMode: this.testMode,
    };
  }

  // Configuration helpers
  static validateConfig(): boolean {
    try {
      if (!config.jira.baseUrl) {
        throw new Error('JIRA_BASE_URL is required');
      }

      if (!config.jira.authToken) {
        throw new Error('JIRA_AUTH_TOKEN is required');
      }

      if (!config.jira.endpoint) {
        throw new Error('JIRA endpoint path is required');
      }

      // Validate URL format
      new URL(config.jira.baseUrl);

      return true;
    } catch (error) {
      console.error('Jira configuration validation failed:', error);
      return false;
    }
  }

  // Get client configuration info (for debugging)
  getConfig(): { baseUrl: string; endpoint: string; testMode: boolean; timeout: number } {
    return {
      baseUrl: config.jira.baseUrl,
      endpoint: config.jira.endpoint,
      testMode: this.testMode,
      timeout: config.jira.timeout,
    };
  }
}