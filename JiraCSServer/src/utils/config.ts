import dotenv from 'dotenv';
import { Config } from '../types';

// Load environment variables
dotenv.config();

export const config: Config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },
  jira: {
    baseUrl: process.env.JIRA_BASE_URL || 'https://jirastage.deltaww.com',
    authToken: process.env.JIRA_AUTH_TOKEN || 'YWx2aXMuYWRtaW46UGFyYTk0Nzg=',
    endpoint: '/rest/scriptrunner/latest/custom/JiraPostRecv',
    timeout: 30000,
  },
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    testMode: process.env.TEST_MODE === 'true',
  },
};

export function validateConfig(): void {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  if (!config.jira.baseUrl) {
    throw new Error('JIRA_BASE_URL is required');
  }

  if (!config.jira.authToken) {
    throw new Error('JIRA_AUTH_TOKEN is required');
  }
}

export default config;