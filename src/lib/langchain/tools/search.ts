/**
 * Search Tool Implementation
 * Advanced search tool with knowledge base and web search capabilities
 */

import { Tool } from '@langchain/core/tools';
import KnowledgeBaseRetriever from '../retrievers/knowledge-base';
import { ToolError } from '../types';

export class SearchTool extends Tool {
  name = 'search';
  description = 'Search for information in the knowledge base with advanced filtering and ranking';

  constructor(private knowledgeBaseRetriever: KnowledgeBaseRetriever) {
    super();
  }

  async _call(input: string): Promise<string> {
    try {
      const searchParams = this.parseSearchInput(input);
      const results = await this.knowledgeBaseRetriever.advancedSearch(
        searchParams.query,
        searchParams.options
      );

      return JSON.stringify({
        query: searchParams.query,
        totalFound: results.totalFound,
        searchTime: results.searchTime,
        documents: results.documents.map(doc => ({
          id: doc.id,
          title: doc.metadata.title,
          content: doc.content.substring(0, 300) + '...',
          source: doc.metadata.source,
          url: doc.metadata.url,
          relevanceScore: doc.metadata.relevanceScore,
          category: doc.metadata.category,
          tags: doc.metadata.tags,
        })),
        facets: results.facets,
      });
    } catch (error) {
      throw new ToolError(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input }
      );
    }
  }

  private parseSearchInput(input: string): {
    query: string;
    options: Parameters<typeof this.knowledgeBaseRetriever.advancedSearch>[1];
  } {
    try {
      const parsed = JSON.parse(input);
      return {
        query: parsed.query || input,
        options: parsed.options || {},
      };
    } catch {
      // Treat as plain text query
      return {
        query: input,
        options: {},
      };
    }
  }
}