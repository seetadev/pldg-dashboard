/**
 * Vector Store Implementation
 * Supports multiple vector databases: Pinecone, Chroma, Qdrant, and in-memory
 */

import { VectorStore } from '@langchain/core/vectorstores';
import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document as LangChainDocument } from '@langchain/core/documents';

// Vector store implementations
import { PineconeStore } from '@langchain/pinecone';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

// Pinecone client
import { Pinecone } from '@pinecone-database/pinecone';

import { langChainConfig } from '../config';
import {
  Document,
  VectorStoreConfig,
  SearchQuery,
  SearchResult,
  RetrieverError,
} from '../types';

export class VectorStoreManager {
  private vectorStore: VectorStore | null = null;
  private embeddings: Embeddings;
  private config: VectorStoreConfig;

  constructor(config?: Partial<VectorStoreConfig>) {
    this.config = {
      ...langChainConfig.vectorStore,
      ...config,
    };
    
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: langChainConfig.openai.apiKey,
      modelName: 'text-embedding-3-small',
      dimensions: this.config.dimensions,
    });
  }

  /**
   * Initialize the vector store based on provider
   */
  async initialize(): Promise<void> {
    try {
      switch (this.config.provider) {
        case 'pinecone':
          this.vectorStore = await this.initializePinecone();
          break;
        case 'chroma':
          this.vectorStore = await this.initializeChroma();
          break;
        case 'qdrant':
          this.vectorStore = await this.initializeQdrant();
          break;
        case 'memory':
        default:
          this.vectorStore = await this.initializeMemory();
          break;
      }
    } catch (error) {
      throw new RetrieverError(
        `Failed to initialize vector store: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: this.config.provider, config: this.config }
      );
    }
  }

  /**
   * Initialize Pinecone vector store
   */
  private async initializePinecone(): Promise<PineconeStore> {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });

    const pineconeIndex = pinecone.Index(this.config.indexName);

    return await PineconeStore.fromExistingIndex(this.embeddings, {
      pineconeIndex,
      namespace: this.config.namespace,
    });
  }

  /**
   * Initialize Chroma vector store
   */
  private async initializeChroma(): Promise<Chroma> {
    return new Chroma(this.embeddings, {
      url: process.env.CHROMA_URL || 'http://localhost:8000',
      collectionName: this.config.indexName,
    });
  }

  /**
   * Initialize Qdrant vector store
   */
  private async initializeQdrant(): Promise<QdrantVectorStore> {
    return await QdrantVectorStore.fromExistingCollection(this.embeddings, {
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      collectionName: this.config.indexName,
    });
  }

  /**
   * Initialize in-memory vector store
   */
  private async initializeMemory(): Promise<MemoryVectorStore> {
    return new MemoryVectorStore(this.embeddings);
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      const langchainDocs = documents.map(doc => new LangChainDocument({
        pageContent: doc.content,
        metadata: {
          id: doc.id,
          title: doc.metadata.title,
          source: doc.metadata.source,
          url: doc.metadata.url,
          author: doc.metadata.author,
          createdAt: doc.metadata.createdAt.toISOString(),
          updatedAt: doc.metadata.updatedAt.toISOString(),
          tags: doc.metadata.tags,
          category: doc.metadata.category,
          language: doc.metadata.language,
          wordCount: doc.metadata.wordCount,
          quality: doc.metadata.quality,
        },
      }));

      await this.vectorStore!.addDocuments(langchainDocs);
    } catch (error) {
      throw new RetrieverError(
        `Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { documentCount: documents.length }
      );
    }
  }

  /**
   * Search for similar documents
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const searchOptions = {
        k: query.options?.topK || langChainConfig.retriever.topK,
        scoreThreshold: query.options?.scoreThreshold || langChainConfig.retriever.scoreThreshold,
      };

      // Build filter from query filters
      const filter = this.buildFilter(query.filters);

      const results = await this.vectorStore!.similaritySearchWithScore(
        query.query,
        searchOptions.k,
        filter
      );

      // Convert results back to our Document format
      const documents = results
        .filter(([, score]) => score >= searchOptions.scoreThreshold)
        .map(([doc, score]) => this.convertLangChainDocument(doc, score));

      const searchTime = Date.now() - startTime;

      return {
        documents,
        totalFound: documents.length,
        searchTime,
        query,
      };

    } catch (error) {
      throw new RetrieverError(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query: query.query, filters: query.filters }
      );
    }
  }

  /**
   * Build filter object for vector store
   */
  private buildFilter(filters?: SearchQuery['filters']): Record<string, any> | undefined {
    if (!filters) return undefined;

    const filter: Record<string, any> = {};

    if (filters.categories?.length) {
      filter.category = { $in: filters.categories };
    }

    if (filters.tags?.length) {
      filter.tags = { $in: filters.tags };
    }

    if (filters.sources?.length) {
      filter.source = { $in: filters.sources };
    }

    if (filters.minQuality !== undefined) {
      filter.quality = { $gte: filters.minQuality };
    }

    if (filters.dateRange) {
      filter.createdAt = {
        $gte: filters.dateRange.start.toISOString(),
        $lte: filters.dateRange.end.toISOString(),
      };
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * Convert LangChain document back to our format
   */
  private convertLangChainDocument(doc: LangChainDocument, score: number): Document {
    return {
      id: doc.metadata.id,
      content: doc.pageContent,
      metadata: {
        title: doc.metadata.title,
        source: doc.metadata.source,
        url: doc.metadata.url,
        author: doc.metadata.author,
        createdAt: new Date(doc.metadata.createdAt),
        updatedAt: new Date(doc.metadata.updatedAt),
        tags: doc.metadata.tags || [],
        category: doc.metadata.category,
        language: doc.metadata.language || 'en',
        wordCount: doc.metadata.wordCount || 0,
        quality: doc.metadata.quality || 0,
        relevanceScore: score,
      } as any, // Type assertion to handle the additional relevanceScore
    };
  }

  /**
   * Delete documents by ID
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      // Note: Not all vector stores support deletion by ID
      // This is a simplified implementation
      if ('delete' in this.vectorStore) {
        await (this.vectorStore as any).delete({ ids });
      } else {
        console.warn('Document deletion not supported by this vector store provider');
      }
    } catch (error) {
      throw new RetrieverError(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { ids }
      );
    }
  }

  /**
   * Update documents
   */
  async updateDocuments(documents: Document[]): Promise<void> {
    // Simple implementation: delete and re-add
    const ids = documents.map(doc => doc.id);
    await this.deleteDocuments(ids);
    await this.addDocuments(documents);
  }

  /**
   * Get document count
   */
  async getDocumentCount(): Promise<number> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      // This is provider-specific and might not be available for all stores
      if ('getCollectionInfo' in this.vectorStore) {
        const info = await (this.vectorStore as any).getCollectionInfo();
        return info.vectorCount || 0;
      }
      return 0;
    } catch (error) {
      console.warn('Failed to get document count:', error);
      return 0;
    }
  }

  /**
   * Create embeddings for text
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      return await this.embeddings.embedDocuments(texts);
    } catch (error) {
      throw new RetrieverError(
        `Failed to create embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { textCount: texts.length }
      );
    }
  }

  /**
   * Create embedding for a single query
   */
  async createQueryEmbedding(query: string): Promise<number[]> {
    try {
      return await this.embeddings.embedQuery(query);
    } catch (error) {
      throw new RetrieverError(
        `Failed to create query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query }
      );
    }
  }

  /**
   * Health check for the vector store
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      if (!this.vectorStore) {
        await this.initialize();
      }

      // Test with a simple search
      const testResult = await this.search({
        query: 'test',
        options: { topK: 1 },
      });

      const documentCount = await this.getDocumentCount();

      return {
        status: 'healthy',
        details: {
          provider: this.config.provider,
          indexName: this.config.indexName,
          documentCount,
          testSearchTime: testResult.searchTime,
          dimensions: this.config.dimensions,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          provider: this.config.provider,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Clear all documents from the vector store
   */
  async clear(): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      if ('clear' in this.vectorStore) {
        await (this.vectorStore as any).clear();
      } else {
        console.warn('Clear operation not supported by this vector store provider');
      }
    } catch (error) {
      throw new RetrieverError(
        `Failed to clear vector store: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get vector store statistics
   */
  async getStatistics(): Promise<{
    documentCount: number;
    provider: string;
    indexName: string;
    dimensions: number;
    namespace?: string;
  }> {
    const documentCount = await this.getDocumentCount();
    
    return {
      documentCount,
      provider: this.config.provider,
      indexName: this.config.indexName,
      dimensions: this.config.dimensions,
      namespace: this.config.namespace,
    };
  }
}

export default VectorStoreManager;