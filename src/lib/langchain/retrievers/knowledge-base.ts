/**
 * Knowledge Base Retriever
 * High-level retriever that orchestrates document search, ranking, and filtering
 */

import { BaseRetriever } from '@langchain/core/retrievers';
import { Document as LangChainDocument } from '@langchain/core/documents';
import { VectorStoreRetriever } from '@langchain/core/vectorstores';
import { DocumentCompressor } from 'langchain/retrievers/document_compressors';
import { EmbeddingsFilter } from 'langchain/retrievers/document_compressors/embeddings_filter';

import VectorStoreManager from './vector-store';
import { langChainConfig } from '../config';
import {
  Document,
  SearchQuery,
  SearchResult,
  SourceReference,
  RetrieverConfig,
  RetrieverError,
} from '../types';

export class KnowledgeBaseRetriever {
  private vectorStoreManager: VectorStoreManager;
  private baseRetriever: VectorStoreRetriever | null = null;
  private compressor: DocumentCompressor | null = null;
  private config: RetrieverConfig;

  constructor(config?: Partial<RetrieverConfig>) {
    this.config = {
      vectorStore: langChainConfig.vectorStore,
      reranker: {
        enabled: true,
        topK: langChainConfig.retriever.topK,
      },
      preprocessing: {
        chunkSize: 1000,
        chunkOverlap: 200,
        splitByHeaders: true,
        removeStopwords: false,
      },
      ...config,
    };

    this.vectorStoreManager = new VectorStoreManager(this.config.vectorStore);
  }

  /**
   * Initialize the retriever
   */
  async initialize(): Promise<void> {
    try {
      await this.vectorStoreManager.initialize();
      await this.setupBaseRetriever();
      await this.setupCompressor();
    } catch (error) {
      throw new RetrieverError(
        `Failed to initialize knowledge base retriever: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { config: this.config }
      );
    }
  }

  /**
   * Setup base vector store retriever
   */
  private async setupBaseRetriever(): Promise<void> {
    // We'll create a custom retriever since we can't directly access the vector store
    this.baseRetriever = new (class extends BaseRetriever {
      lc_namespace = ['langchain', 'retrievers'];
      
      constructor(
        private vectorStore: VectorStoreManager,
        private searchConfig: {
          topK: number;
          scoreThreshold: number;
        }
      ) {
        super();
      }

      async _getRelevantDocuments(query: string): Promise<LangChainDocument[]> {
        const searchQuery: SearchQuery = {
          query,
          options: {
            topK: this.searchConfig.topK,
            scoreThreshold: this.searchConfig.scoreThreshold,
          },
        };

        const results = await this.vectorStore.search(searchQuery);
        
        return results.documents.map(doc => new LangChainDocument({
          pageContent: doc.content,
          metadata: {
            id: doc.id,
            title: doc.metadata.title,
            source: doc.metadata.source,
            url: doc.metadata.url,
            relevanceScore: doc.metadata.relevanceScore,
            ...doc.metadata,
          },
        }));
      }
    })(this.vectorStoreManager, {
      topK: langChainConfig.retriever.topK,
      scoreThreshold: langChainConfig.retriever.scoreThreshold,
    });
  }

  /**
   * Setup document compressor for re-ranking
   */
  private async setupCompressor(): Promise<void> {
    if (this.config.reranker?.enabled) {
      try {
        this.compressor = new EmbeddingsFilter({
          embeddings: await this.vectorStoreManager.createQueryEmbedding('test'),
          similarityThreshold: this.config.reranker?.topK || 0.8,
        });
      } catch (error) {
        console.warn('Failed to setup compressor, continuing without re-ranking:', error);
        this.compressor = null;
      }
    }
  }

  /**
   * Retrieve documents for a query
   */
  async retrieve(query: SearchQuery): Promise<SearchResult> {
    if (!this.baseRetriever) {
      await this.initialize();
    }

    try {
      const startTime = Date.now();

      // Get documents from base retriever
      let documents = await this.baseRetriever!.getRelevantDocuments(query.query);

      // Apply filters if provided
      if (query.filters) {
        documents = this.applyFilters(documents, query.filters);
      }

      // Apply compression/re-ranking if configured
      if (this.compressor && documents.length > 0) {
        documents = await this.compressor.compressDocuments(documents, query.query);
      }

      // Apply final options
      const topK = query.options?.topK || langChainConfig.retriever.topK;
      documents = documents.slice(0, topK);

      // Convert to our Document format
      const processedDocuments = documents.map(doc => this.convertToDocument(doc));

      const searchTime = Date.now() - startTime;

      return {
        documents: processedDocuments,
        totalFound: processedDocuments.length,
        searchTime,
        query,
      };

    } catch (error) {
      throw new RetrieverError(
        `Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query: query.query }
      );
    }
  }

  /**
   * Apply filters to documents
   */
  private applyFilters(
    documents: LangChainDocument[],
    filters: SearchQuery['filters']
  ): LangChainDocument[] {
    if (!filters) return documents;

    return documents.filter(doc => {
      // Category filter
      if (filters.categories?.length && !filters.categories.includes(doc.metadata.category)) {
        return false;
      }

      // Tags filter
      if (filters.tags?.length) {
        const docTags = doc.metadata.tags || [];
        if (!filters.tags.some(tag => docTags.includes(tag))) {
          return false;
        }
      }

      // Source filter
      if (filters.sources?.length && !filters.sources.includes(doc.metadata.source)) {
        return false;
      }

      // Quality filter
      if (filters.minQuality !== undefined && doc.metadata.quality < filters.minQuality) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const docDate = new Date(doc.metadata.createdAt);
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Convert LangChain document to our Document format
   */
  private convertToDocument(doc: LangChainDocument): Document {
    return {
      id: doc.metadata.id || '',
      content: doc.pageContent,
      metadata: {
        title: doc.metadata.title || '',
        source: doc.metadata.source || '',
        url: doc.metadata.url,
        author: doc.metadata.author,
        createdAt: new Date(doc.metadata.createdAt || Date.now()),
        updatedAt: new Date(doc.metadata.updatedAt || Date.now()),
        tags: doc.metadata.tags || [],
        category: doc.metadata.category || '',
        language: doc.metadata.language || 'en',
        wordCount: doc.metadata.wordCount || 0,
        quality: doc.metadata.quality || 0,
        relevanceScore: doc.metadata.relevanceScore || 0,
      } as any,
    };
  }

  /**
   * Convert documents to source references
   */
  convertToSourceReferences(documents: Document[]): SourceReference[] {
    return documents.map(doc => ({
      id: doc.id,
      title: doc.metadata.title,
      content: this.truncateContent(doc.content, 500),
      url: doc.metadata.url,
      relevanceScore: doc.metadata.relevanceScore || 0,
      metadata: {
        source: doc.metadata.source,
        author: doc.metadata.author,
        category: doc.metadata.category,
        tags: doc.metadata.tags,
        createdAt: doc.metadata.createdAt.toISOString(),
        quality: doc.metadata.quality,
      },
    }));
  }

  /**
   * Truncate content for source references
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Add documents to the knowledge base
   */
  async addDocuments(documents: Document[]): Promise<void> {
    try {
      // Preprocess documents if needed
      const processedDocuments = await this.preprocessDocuments(documents);
      
      await this.vectorStoreManager.addDocuments(processedDocuments);
    } catch (error) {
      throw new RetrieverError(
        `Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { documentCount: documents.length }
      );
    }
  }

  /**
   * Preprocess documents before adding to vector store
   */
  private async preprocessDocuments(documents: Document[]): Promise<Document[]> {
    const processed: Document[] = [];

    for (const doc of documents) {
      if (this.config.preprocessing?.chunkSize) {
        // Split document into chunks if it's too large
        const chunks = this.splitDocument(doc, this.config.preprocessing.chunkSize);
        processed.push(...chunks);
      } else {
        processed.push(doc);
      }
    }

    return processed;
  }

  /**
   * Split document into chunks
   */
  private splitDocument(document: Document, chunkSize: number): Document[] {
    const content = document.content;
    
    if (content.length <= chunkSize) {
      return [document];
    }

    const chunks: Document[] = [];
    const overlap = this.config.preprocessing?.chunkOverlap || 0;
    
    for (let i = 0; i < content.length; i += chunkSize - overlap) {
      const chunkContent = content.substring(i, i + chunkSize);
      
      chunks.push({
        id: `${document.id}_chunk_${chunks.length}`,
        content: chunkContent,
        metadata: {
          ...document.metadata,
          title: `${document.metadata.title} (Part ${chunks.length + 1})`,
          isChunk: true,
          chunkIndex: chunks.length,
          parentDocumentId: document.id,
        } as any,
      });
    }

    return chunks;
  }

  /**
   * Update documents in the knowledge base
   */
  async updateDocuments(documents: Document[]): Promise<void> {
    await this.vectorStoreManager.updateDocuments(documents);
  }

  /**
   * Delete documents from the knowledge base
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    await this.vectorStoreManager.deleteDocuments(ids);
  }

  /**
   * Search with advanced options
   */
  async advancedSearch(
    query: string,
    options: {
      categories?: string[];
      tags?: string[];
      sources?: string[];
      dateRange?: { start: Date; end: Date };
      minQuality?: number;
      topK?: number;
      includeSnippets?: boolean;
      rerank?: boolean;
    } = {}
  ): Promise<{
    documents: Document[];
    totalFound: number;
    searchTime: number;
    facets?: Record<string, Record<string, number>>;
  }> {
    const searchQuery: SearchQuery = {
      query,
      filters: {
        categories: options.categories,
        tags: options.tags,
        sources: options.sources,
        dateRange: options.dateRange,
        minQuality: options.minQuality,
      },
      options: {
        topK: options.topK,
        rerank: options.rerank,
      },
    };

    const result = await this.retrieve(searchQuery);

    return {
      documents: result.documents,
      totalFound: result.totalFound,
      searchTime: result.searchTime,
      facets: await this.calculateFacets(result.documents),
    };
  }

  /**
   * Calculate facets from search results
   */
  private async calculateFacets(documents: Document[]): Promise<Record<string, Record<string, number>>> {
    const facets: Record<string, Record<string, number>> = {
      categories: {},
      sources: {},
      tags: {},
    };

    documents.forEach(doc => {
      // Categories
      const category = doc.metadata.category;
      facets.categories[category] = (facets.categories[category] || 0) + 1;

      // Sources
      const source = doc.metadata.source;
      facets.sources[source] = (facets.sources[source] || 0) + 1;

      // Tags
      doc.metadata.tags.forEach(tag => {
        facets.tags[tag] = (facets.tags[tag] || 0) + 1;
      });
    });

    return facets;
  }

  /**
   * Get knowledge base statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    categories: Record<string, number>;
    sources: Record<string, number>;
    averageQuality: number;
    vectorStore: Awaited<ReturnType<VectorStoreManager['getStatistics']>>;
  }> {
    const vectorStoreStats = await this.vectorStoreManager.getStatistics();
    
    // For detailed statistics, we'd need to query all documents
    // This is a simplified version
    return {
      totalDocuments: vectorStoreStats.documentCount,
      categories: {},
      sources: {},
      averageQuality: 0,
      vectorStore: vectorStoreStats,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const vectorStoreHealth = await this.vectorStoreManager.healthCheck();
      const testSearch = await this.retrieve({
        query: 'test',
        options: { topK: 1 },
      });

      return {
        status: vectorStoreHealth.status,
        details: {
          vectorStore: vectorStoreHealth.details,
          retriever: {
            initialized: !!this.baseRetriever,
            compressorEnabled: !!this.compressor,
            testSearchTime: testSearch.searchTime,
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Clear the knowledge base
   */
  async clear(): Promise<void> {
    await this.vectorStoreManager.clear();
  }
}

export default KnowledgeBaseRetriever;