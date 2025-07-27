/**
 * LangChain Configuration Module
 * Centralized configuration for all LangChain operations
 */

import { z } from 'zod';

// Configuration schema validation
export const LangChainConfigSchema = z.object({
  // Model configurations
  openai: z.object({
    apiKey: z.string().min(1, 'OpenAI API key is required'),
    model: z.string().default('gpt-4-turbo-preview'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().positive().default(4000),
    maxRetries: z.number().positive().default(3),
  }),
  
  anthropic: z.object({
    apiKey: z.string().min(1, 'Anthropic API key is required'),
    model: z.string().default('claude-3-sonnet-20240229'),
    temperature: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().positive().default(4000),
    maxRetries: z.number().positive().default(3),
  }),

  // Vector store configuration
  vectorStore: z.object({
    provider: z.enum(['pinecone', 'chroma', 'qdrant', 'memory']).default('memory'),
    dimensions: z.number().positive().default(1536),
    indexName: z.string().default('knowledge-base'),
    namespace: z.string().default('default'),
  }),

  // Retriever configuration
  retriever: z.object({
    topK: z.number().positive().default(5),
    scoreThreshold: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().positive().default(8000),
  }),

  // Agent configuration
  agent: z.object({
    maxIterations: z.number().positive().default(10),
    timeoutMs: z.number().positive().default(60000),
    verbose: z.boolean().default(false),
    memorySize: z.number().positive().default(100),
  }),

  // Fact-checking configuration
  factCheck: z.object({
    confidenceThreshold: z.number().min(0).max(1).default(0.8),
    maxSources: z.number().positive().default(3),
    enableWebSearch: z.boolean().default(true),
    enableKnowledgeBase: z.boolean().default(true),
  }),
});

export type LangChainConfig = z.infer<typeof LangChainConfigSchema>;

// Default configuration
const defaultConfig: LangChainConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 4000,
    maxRetries: 3,
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 4000,
    maxRetries: 3,
  },
  vectorStore: {
    provider: (process.env.VECTOR_STORE_PROVIDER as any) || 'memory',
    dimensions: parseInt(process.env.VECTOR_DIMENSIONS || '1536'),
    indexName: process.env.VECTOR_INDEX_NAME || 'knowledge-base',
    namespace: process.env.VECTOR_NAMESPACE || 'default',
  },
  retriever: {
    topK: parseInt(process.env.RETRIEVER_TOP_K || '5'),
    scoreThreshold: parseFloat(process.env.RETRIEVER_SCORE_THRESHOLD || '0.7'),
    maxTokens: parseInt(process.env.RETRIEVER_MAX_TOKENS || '8000'),
  },
  agent: {
    maxIterations: parseInt(process.env.AGENT_MAX_ITERATIONS || '10'),
    timeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS || '60000'),
    verbose: process.env.AGENT_VERBOSE === 'true',
    memorySize: parseInt(process.env.AGENT_MEMORY_SIZE || '100'),
  },
  factCheck: {
    confidenceThreshold: parseFloat(process.env.FACT_CHECK_CONFIDENCE_THRESHOLD || '0.8'),
    maxSources: parseInt(process.env.FACT_CHECK_MAX_SOURCES || '3'),
    enableWebSearch: process.env.FACT_CHECK_ENABLE_WEB_SEARCH !== 'false',
    enableKnowledgeBase: process.env.FACT_CHECK_ENABLE_KNOWLEDGE_BASE !== 'false',
  },
};

// Validate and export configuration
export const langChainConfig = LangChainConfigSchema.parse(defaultConfig);

// Environment validation
export function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    errors.push('Either OPENAI_API_KEY or ANTHROPIC_API_KEY must be provided');
  }

  if (process.env.VECTOR_STORE_PROVIDER === 'pinecone' && !process.env.PINECONE_API_KEY) {
    errors.push('PINECONE_API_KEY is required when using Pinecone vector store');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Model provider enum
export enum ModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
}

// Get active model provider
export function getActiveModelProvider(): ModelProvider {
  if (process.env.ANTHROPIC_API_KEY && !process.env.PREFER_OPENAI) {
    return ModelProvider.ANTHROPIC;
  }
  return ModelProvider.OPENAI;
}

// Logging configuration
export const loggingConfig = {
  level: process.env.LOG_LEVEL || 'info',
  enableAgentLogs: process.env.ENABLE_AGENT_LOGS === 'true',
  enableToolLogs: process.env.ENABLE_TOOL_LOGS === 'true',
  enableRetrieverLogs: process.env.ENABLE_RETRIEVER_LOGS === 'true',
};