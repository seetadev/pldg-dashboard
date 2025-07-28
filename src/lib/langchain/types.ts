/**
 * LangChain Type Definitions
 * Comprehensive type definitions for the LangChain integration
 */

import { z } from 'zod';

// =============================================================================
// CORE TYPES
// =============================================================================

export interface AgentResponse {
  content: string;
  confidence: number;
  sources: SourceReference[];
  reasoning?: string;
  metadata: ResponseMetadata;
}

export interface SourceReference {
  id: string;
  title: string;
  content: string;
  url?: string;
  relevanceScore: number;
  metadata: Record<string, any>;
}

export interface ResponseMetadata {
  model: string;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  executionTime: number;
  timestamp: Date;
  agentSteps?: AgentStep[];
}

export interface AgentStep {
  step: number;
  action: string;
  observation: string;
  reasoning: string;
  toolUsed?: string;
}

// =============================================================================
// KNOWLEDGE BASE TYPES
// =============================================================================

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embeddings?: number[];
}

export interface DocumentMetadata {
  title: string;
  source: string;
  url?: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
  language: string;
  wordCount: number;
  quality: number; // 0-1 quality score
}

export interface SearchQuery {
  query: string;
  filters?: QueryFilters;
  options?: SearchOptions;
}

export interface QueryFilters {
  categories?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  sources?: string[];
  minQuality?: number;
}

export interface SearchOptions {
  topK?: number;
  scoreThreshold?: number;
  includeEmbeddings?: boolean;
  rerank?: boolean;
}

export interface SearchResult {
  documents: Document[];
  totalFound: number;
  searchTime: number;
  query: SearchQuery;
}

// =============================================================================
// FACT-CHECKING TYPES
// =============================================================================

export interface FactCheckRequest {
  claim: string;
  context?: string;
  sources?: string[];
  options?: FactCheckOptions;
}

export interface FactCheckOptions {
  enableWebSearch: boolean;
  enableKnowledgeBase: boolean;
  confidenceThreshold: number;
  maxSources: number;
  requireMultipleSources: boolean;
}

export interface FactCheckResult {
  claim: string;
  verdict: FactCheckVerdict;
  confidence: number;
  evidence: Evidence[];
  reasoning: string;
  metadata: FactCheckMetadata;
}

export enum FactCheckVerdict {
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  PARTIALLY_TRUE = 'PARTIALLY_TRUE',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  DISPUTED = 'DISPUTED',
}

export interface Evidence {
  id: string;
  source: string;
  content: string;
  url?: string;
  relevanceScore: number;
  trustScore: number;
  verdict: FactCheckVerdict;
  extractedFacts: string[];
}

export interface FactCheckMetadata {
  totalSources: number;
  webSources: number;
  knowledgeBaseSources: number;
  processingTime: number;
  modelUsed: string;
  timestamp: Date;
}

// =============================================================================
// TOOL TYPES
// =============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameters;
  function: ToolFunction;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ParameterSchema>;
  required: string[];
}

export interface ParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: ParameterSchema;
  properties?: Record<string, ParameterSchema>;
}

export type ToolFunction = (parameters: Record<string, any>) => Promise<ToolResult>;

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// AGENT TYPES
// =============================================================================

export interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools: ToolDefinition[];
  model: ModelConfig;
  memory: MemoryConfig;
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic';
  modelName: string;
  temperature: number;
  maxTokens: number;
  timeout: number;
}

export interface MemoryConfig {
  type: 'buffer' | 'summary' | 'vector';
  maxTokens: number;
  summaryPrompt?: string;
}

export interface ConversationMemory {
  messages: ConversationMessage[];
  summary?: string;
  tokenCount: number;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// =============================================================================
// RETRIEVER TYPES
// =============================================================================

export interface RetrieverConfig {
  vectorStore: VectorStoreConfig;
  reranker?: RerankerConfig;
  preprocessing?: PreprocessingConfig;
}

export interface VectorStoreConfig {
  provider: 'pinecone' | 'chroma' | 'qdrant' | 'memory';
  indexName: string;
  dimensions: number;
  metadata?: Record<string, any>;
}

export interface RerankerConfig {
  enabled: boolean;
  model?: string;
  topK: number;
}

export interface PreprocessingConfig {
  chunkSize: number;
  chunkOverlap: number;
  splitByHeaders: boolean;
  removeStopwords: boolean;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export class LangChainError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'LangChainError';
  }
}

export class ModelError extends LangChainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'MODEL_ERROR', details);
    this.name = 'ModelError';
  }
}

export class RetrieverError extends LangChainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'RETRIEVER_ERROR', details);
    this.name = 'RetrieverError';
  }
}

export class ToolError extends LangChainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOOL_ERROR', details);
    this.name = 'ToolError';
  }
}

export class ValidationError extends LangChainError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

export const FactCheckRequestSchema = z.object({
  claim: z.string().min(1, 'Claim cannot be empty'),
  context: z.string().optional(),
  sources: z.array(z.string().url()).optional(),
  options: z.object({
    enableWebSearch: z.boolean().default(true),
    enableKnowledgeBase: z.boolean().default(true),
    confidenceThreshold: z.number().min(0).max(1).default(0.8),
    maxSources: z.number().min(1).max(20).default(5),
    requireMultipleSources: z.boolean().default(true),
  }).optional(),
});

export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  filters: z.object({
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.date(),
      end: z.date(),
    }).optional(),
    sources: z.array(z.string()).optional(),
    minQuality: z.number().min(0).max(1).optional(),
  }).optional(),
  options: z.object({
    topK: z.number().min(1).max(100).default(5),
    scoreThreshold: z.number().min(0).max(1).default(0.7),
    includeEmbeddings: z.boolean().default(false),
    rerank: z.boolean().default(true),
  }).optional(),
});

export const DocumentSchema = z.object({
  id: z.string(),
  content: z.string().min(1),
  metadata: z.object({
    title: z.string(),
    source: z.string(),
    url: z.string().url().optional(),
    author: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    tags: z.array(z.string()),
    category: z.string(),
    language: z.string().default('en'),
    wordCount: z.number().min(0),
    quality: z.number().min(0).max(1),
  }),
  embeddings: z.array(z.number()).optional(),
});

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type Awaitable<T> = T | Promise<T>;

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AsyncIterableResult<T> {
  [Symbol.asyncIterator](): AsyncIterator<T>;
}

// Export all types for convenience
export type {
  AgentResponse,
  SourceReference,
  ResponseMetadata,
  AgentStep,
  Document,
  DocumentMetadata,
  SearchQuery,
  QueryFilters,
  SearchOptions,
  SearchResult,
  FactCheckRequest,
  FactCheckOptions,
  FactCheckResult,
  Evidence,
  FactCheckMetadata,
  ToolDefinition,
  ToolParameters,
  ParameterSchema,
  ToolFunction,
  ToolResult,
  AgentConfig,
  ModelConfig,
  MemoryConfig,
  ConversationMemory,
  ConversationMessage,
  RetrieverConfig,
  VectorStoreConfig,
  RerankerConfig,
  PreprocessingConfig,
};