/**
 * LangChain Integration Main Export
 * Central entry point for all LangChain functionality
 */

// Core configuration and types
export * from './config';
export * from './types';

// Models and agents
export { ModelFactory, ModelUtils } from './models';
export { BaseAgent } from './agents/base-agent';

// Retrievers
export { default as VectorStoreManager } from './retrievers/vector-store';
export { default as KnowledgeBaseRetriever } from './retrievers/knowledge-base';

// Tools
export { ToolRegistry, FactCheckTool, factCheckToolSchema } from './tools';

// Utilities
export { Logger, ErrorHandler, safeExecute } from './utils';
export {
  TextUtils,
  ValidationUtils,
  PerformanceUtils,
  CacheUtils,
  AsyncUtils,
  SecurityUtils,
  FileUtils,
  DateUtils,
} from './utils';

// Services (main agent service)
export { AgentService, agentService } from '../services/agents';

// Convenience exports for quick setup
export { langChainConfig, validateEnvironment } from './config';

/**
 * Quick initialization helper
 */
export async function initializeLangChain(customConfig?: Partial<typeof langChainConfig>): Promise<{
  agentService: import('../services/agents').AgentService;
  isHealthy: boolean;
  stats: any;
}> {
  // Merge custom configuration if provided
  if (customConfig) {
    Object.assign(langChainConfig, customConfig);
  }

  // Validate environment
  const envValidation = validateEnvironment();
  if (!envValidation.isValid) {
    throw new Error(`Environment validation failed: ${envValidation.errors.join(', ')}`);
  }

  // Get agent service instance
  const { agentService } = await import('../services/agents');

  // Initialize if not already initialized
  if (!agentService.isInitialized()) {
    await agentService.initialize();
  }

  // Get health status
  const healthStatus = await agentService.getHealthStatus();
  const stats = await agentService.getStatistics();

  return {
    agentService,
    isHealthy: healthStatus.status === 'healthy',
    stats,
  };
}

/**
 * Quick agent creation helper
 */
export async function createQuickAgent(
  type: 'general' | 'researcher' | 'analyst' = 'general'
): Promise<import('../services/agents').AgentService> {
  const { agentService } = await initializeLangChain();
  return agentService;
}

/**
 * Quick fact-check helper
 */
export async function quickFactCheck(claim: string): Promise<any> {
  const { agentService } = await initializeLangChain();
  return agentService.factCheck({ claim });
}

/**
 * Quick search helper
 */
export async function quickSearch(query: string): Promise<any> {
  const { agentService } = await initializeLangChain();
  return agentService.search({ query });
}

/**
 * Quick chat helper
 */
export async function quickChat(
  message: string,
  agentType: 'general' | 'researcher' | 'analyst' = 'general'
): Promise<any> {
  const { agentService } = await initializeLangChain();
  return agentService.chat(agentType, message);
}

// Default export with all functionality
export default {
  // Configuration
  config: langChainConfig,
  validateEnvironment,
  
  // Core classes
  ModelFactory,
  BaseAgent,
  VectorStoreManager,
  KnowledgeBaseRetriever,
  ToolRegistry,
  FactCheckTool,
  
  // Utilities
  Logger,
  ErrorHandler,
  TextUtils,
  ValidationUtils,
  PerformanceUtils,
  
  // Quick helpers
  initialize: initializeLangChain,
  createAgent: createQuickAgent,
  factCheck: quickFactCheck,
  search: quickSearch,
  chat: quickChat,
};