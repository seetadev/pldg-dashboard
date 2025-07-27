/**
 * Fact-Checking Tool Implementation
 * Comprehensive fact-checking with multiple evidence sources
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import fetch from 'node-fetch';

import KnowledgeBaseRetriever from '../retrievers/knowledge-base';
import { ModelFactory } from '../models';
import { langChainConfig } from '../config';
import {
  FactCheckRequest,
  FactCheckResult,
  FactCheckVerdict,
  Evidence,
  FactCheckMetadata,
  ToolError,
  FactCheckRequestSchema,
} from '../types';

/**
 * Web Search Tool for fact-checking
 */
class WebSearchTool extends Tool {
  name = 'web_search';
  description = 'Search the web for information to verify facts';

  private apiKey: string;
  private searchEngine: 'google' | 'bing' | 'duckduckgo';

  constructor(apiKey?: string, searchEngine: 'google' | 'bing' | 'duckduckgo' = 'duckduckgo') {
    super();
    this.apiKey = apiKey || '';
    this.searchEngine = searchEngine;
  }

  async _call(query: string): Promise<string> {
    try {
      const results = await this.performWebSearch(query);
      return JSON.stringify(results);
    } catch (error) {
      throw new ToolError(
        `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query, searchEngine: this.searchEngine }
      );
    }
  }

  private async performWebSearch(query: string): Promise<any[]> {
    switch (this.searchEngine) {
      case 'google':
        return await this.googleSearch(query);
      case 'bing':
        return await this.bingSearch(query);
      case 'duckduckgo':
      default:
        return await this.duckDuckGoSearch(query);
    }
  }

  private async googleSearch(query: string): Promise<any[]> {
    if (!this.apiKey || !process.env.GOOGLE_SEARCH_ENGINE_ID) {
      throw new Error('Google Custom Search API key and Search Engine ID required');
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=5`;
    
    const response = await fetch(url);
    const data = await response.json() as any;

    return data.items?.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      source: 'google',
    })) || [];
  }

  private async bingSearch(query: string): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error('Bing Search API key required');
    }

    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`;
    
    const response = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
      },
    });
    
    const data = await response.json() as any;

    return data.webPages?.value?.map((item: any) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      source: 'bing',
    })) || [];
  }

  private async duckDuckGoSearch(query: string): Promise<any[]> {
    // Simplified DuckDuckGo search (in practice, you'd use their API or scrape carefully)
    // This is a placeholder implementation
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json() as any;

      return data.RelatedTopics?.slice(0, 5).map((item: any) => ({
        title: item.Text?.split(' - ')[0] || 'No title',
        url: item.FirstURL || '',
        snippet: item.Text || '',
        source: 'duckduckgo',
      })) || [];
    } catch (error) {
      // Fallback to mock data for testing
      return [{
        title: 'Search result',
        url: 'https://example.com',
        snippet: `Information about: ${query}`,
        source: 'duckduckgo',
      }];
    }
  }
}

/**
 * Knowledge Base Search Tool for fact-checking
 */
class KnowledgeBaseSearchTool extends Tool {
  name = 'knowledge_base_search';
  description = 'Search the knowledge base for relevant information';

  constructor(private retriever: KnowledgeBaseRetriever) {
    super();
  }

  async _call(query: string): Promise<string> {
    try {
      const results = await this.retriever.retrieve({
        query,
        options: {
          topK: 3,
          scoreThreshold: 0.7,
        },
      });

      return JSON.stringify(results.documents.map(doc => ({
        title: doc.metadata.title,
        content: doc.content.substring(0, 500) + '...',
        source: doc.metadata.source,
        url: doc.metadata.url,
        relevanceScore: doc.metadata.relevanceScore,
      })));
    } catch (error) {
      throw new ToolError(
        `Knowledge base search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query }
      );
    }
  }
}

/**
 * Source Verification Tool
 */
class SourceVerificationTool extends Tool {
  name = 'verify_source';
  description = 'Verify the credibility and reliability of a source';

  async _call(sourceUrl: string): Promise<string> {
    try {
      const verification = await this.verifySource(sourceUrl);
      return JSON.stringify(verification);
    } catch (error) {
      throw new ToolError(
        `Source verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sourceUrl }
      );
    }
  }

  private async verifySource(url: string): Promise<{
    domain: string;
    trustScore: number;
    category: string;
    issues: string[];
  }> {
    const domain = new URL(url).hostname;
    
    // Simple domain-based trust scoring (in practice, you'd use a more sophisticated system)
    const trustScores: Record<string, number> = {
      'wikipedia.org': 0.8,
      'reuters.com': 0.9,
      'bbc.com': 0.9,
      'cnn.com': 0.7,
      'nytimes.com': 0.8,
      'nature.com': 0.95,
      'science.org': 0.95,
      'pubmed.ncbi.nlm.nih.gov': 0.95,
      'arxiv.org': 0.85,
      'github.com': 0.6,
      'stackoverflow.com': 0.6,
    };

    const trustScore = trustScores[domain] || 0.5; // Default trust score
    
    const categories: Record<string, string> = {
      'wikipedia.org': 'encyclopedia',
      'reuters.com': 'news',
      'bbc.com': 'news',
      'nature.com': 'academic',
      'science.org': 'academic',
      'pubmed.ncbi.nlm.nih.gov': 'academic',
      'arxiv.org': 'preprint',
    };

    const category = categories[domain] || 'general';
    const issues: string[] = [];

    if (trustScore < 0.6) {
      issues.push('Low trust score');
    }

    if (domain.includes('blog') || domain.includes('wordpress')) {
      issues.push('Personal blog or opinion site');
    }

    return {
      domain,
      trustScore,
      category,
      issues,
    };
  }
}

/**
 * Main Fact-Checking Tool
 */
export class FactCheckTool extends Tool {
  name = 'fact_check';
  description = 'Verify claims using multiple sources and evidence';

  private webSearchTool: WebSearchTool;
  private knowledgeBaseTool: KnowledgeBaseSearchTool;
  private sourceVerificationTool: SourceVerificationTool;
  private model = ModelFactory.getActiveModel();

  constructor(
    knowledgeBaseRetriever: KnowledgeBaseRetriever,
    webSearchApiKey?: string
  ) {
    super();
    this.webSearchTool = new WebSearchTool(webSearchApiKey);
    this.knowledgeBaseTool = new KnowledgeBaseSearchTool(knowledgeBaseRetriever);
    this.sourceVerificationTool = new SourceVerificationTool();
  }

  async _call(input: string): Promise<string> {
    try {
      const request = JSON.parse(input) as FactCheckRequest;
      const result = await this.factCheck(request);
      return JSON.stringify(result);
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Treat as a simple claim string
        const result = await this.factCheck({ claim: input });
        return JSON.stringify(result);
      }
      throw error;
    }
  }

  /**
   * Main fact-checking logic
   */
  async factCheck(request: FactCheckRequest): Promise<FactCheckResult> {
    const startTime = Date.now();

    try {
      // Validate the request
      const validatedRequest = FactCheckRequestSchema.parse(request);
      
      const options = {
        enableWebSearch: true,
        enableKnowledgeBase: true,
        confidenceThreshold: 0.8,
        maxSources: 5,
        requireMultipleSources: true,
        ...validatedRequest.options,
      };

      // Collect evidence from multiple sources
      const evidence: Evidence[] = [];

      // Search knowledge base if enabled
      if (options.enableKnowledgeBase) {
        const kbEvidence = await this.searchKnowledgeBase(validatedRequest.claim);
        evidence.push(...kbEvidence);
      }

      // Search web if enabled
      if (options.enableWebSearch && evidence.length < options.maxSources) {
        const webEvidence = await this.searchWeb(validatedRequest.claim, options.maxSources - evidence.length);
        evidence.push(...webEvidence);
      }

      // Add provided sources if any
      if (validatedRequest.sources?.length) {
        const providedEvidence = await this.processProvidedSources(
          validatedRequest.claim,
          validatedRequest.sources
        );
        evidence.push(...providedEvidence);
      }

      // Analyze evidence and determine verdict
      const analysis = await this.analyzeEvidence(validatedRequest.claim, evidence, validatedRequest.context);
      
      const processingTime = Date.now() - startTime;

      return {
        claim: validatedRequest.claim,
        verdict: analysis.verdict,
        confidence: analysis.confidence,
        evidence: evidence.slice(0, options.maxSources),
        reasoning: analysis.reasoning,
        metadata: {
          totalSources: evidence.length,
          webSources: evidence.filter(e => e.source.includes('web')).length,
          knowledgeBaseSources: evidence.filter(e => e.source.includes('knowledge_base')).length,
          processingTime,
          modelUsed: this.model.constructor.name,
          timestamp: new Date(),
        },
      };

    } catch (error) {
      throw new ToolError(
        `Fact-checking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { claim: request.claim, error }
      );
    }
  }

  /**
   * Search knowledge base for evidence
   */
  private async searchKnowledgeBase(claim: string): Promise<Evidence[]> {
    try {
      const results = await this.knowledgeBaseTool._call(claim);
      const documents = JSON.parse(results);

      return documents.map((doc: any, index: number) => ({
        id: `kb_${index}`,
        source: `knowledge_base:${doc.source}`,
        content: doc.content,
        url: doc.url,
        relevanceScore: doc.relevanceScore || 0.5,
        trustScore: 0.8, // Knowledge base is generally trusted
        verdict: FactCheckVerdict.INSUFFICIENT_EVIDENCE, // Will be determined by analysis
        extractedFacts: [], // Will be populated by analysis
      }));
    } catch (error) {
      console.warn('Knowledge base search failed:', error);
      return [];
    }
  }

  /**
   * Search web for evidence
   */
  private async searchWeb(claim: string, maxResults: number): Promise<Evidence[]> {
    try {
      const results = await this.webSearchTool._call(claim);
      const webResults = JSON.parse(results);

      const evidence: Evidence[] = [];

      for (const result of webResults.slice(0, maxResults)) {
        // Verify source credibility
        const verification = await this.sourceVerificationTool._call(result.url);
        const sourceInfo = JSON.parse(verification);

        evidence.push({
          id: `web_${evidence.length}`,
          source: `web:${sourceInfo.domain}`,
          content: result.snippet,
          url: result.url,
          relevanceScore: 0.7, // Default relevance
          trustScore: sourceInfo.trustScore,
          verdict: FactCheckVerdict.INSUFFICIENT_EVIDENCE, // Will be determined by analysis
          extractedFacts: [], // Will be populated by analysis
        });
      }

      return evidence;
    } catch (error) {
      console.warn('Web search failed:', error);
      return [];
    }
  }

  /**
   * Process provided sources
   */
  private async processProvidedSources(claim: string, sources: string[]): Promise<Evidence[]> {
    const evidence: Evidence[] = [];

    for (const source of sources) {
      try {
        // Fetch content from the source (simplified)
        const response = await fetch(source);
        const content = await response.text();
        
        // Extract relevant snippets (simplified)
        const snippet = content.substring(0, 1000);

        // Verify source
        const verification = await this.sourceVerificationTool._call(source);
        const sourceInfo = JSON.parse(verification);

        evidence.push({
          id: `provided_${evidence.length}`,
          source: `provided:${sourceInfo.domain}`,
          content: snippet,
          url: source,
          relevanceScore: 0.8, // Higher relevance for provided sources
          trustScore: sourceInfo.trustScore,
          verdict: FactCheckVerdict.INSUFFICIENT_EVIDENCE,
          extractedFacts: [],
        });
      } catch (error) {
        console.warn(`Failed to process provided source ${source}:`, error);
      }
    }

    return evidence;
  }

  /**
   * Analyze evidence and determine verdict
   */
  private async analyzeEvidence(
    claim: string,
    evidence: Evidence[],
    context?: string
  ): Promise<{
    verdict: FactCheckVerdict;
    confidence: number;
    reasoning: string;
  }> {
    if (evidence.length === 0) {
      return {
        verdict: FactCheckVerdict.INSUFFICIENT_EVIDENCE,
        confidence: 0.0,
        reasoning: 'No evidence found to support or refute the claim.',
      };
    }

    // Create analysis prompt
    const analysisPrompt = this.createAnalysisPrompt(claim, evidence, context);

    try {
      const response = await this.model.invoke(analysisPrompt);
      const analysis = this.parseAnalysisResponse(response.content.toString());

      return analysis;
    } catch (error) {
      console.error('Evidence analysis failed:', error);
      return {
        verdict: FactCheckVerdict.INSUFFICIENT_EVIDENCE,
        confidence: 0.0,
        reasoning: 'Failed to analyze evidence due to technical error.',
      };
    }
  }

  /**
   * Create analysis prompt for the model
   */
  private createAnalysisPrompt(claim: string, evidence: Evidence[], context?: string): string {
    const evidenceText = evidence.map((e, i) => 
      `Source ${i + 1} (${e.source}, Trust: ${e.trustScore}): ${e.content}`
    ).join('\n\n');

    return `
You are a fact-checking expert. Analyze the following claim against the provided evidence and determine its veracity.

CLAIM: ${claim}

${context ? `CONTEXT: ${context}` : ''}

EVIDENCE:
${evidenceText}

Please analyze this claim and provide your assessment in the following JSON format:
{
  "verdict": "TRUE|FALSE|PARTIALLY_TRUE|INSUFFICIENT_EVIDENCE|DISPUTED",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation of your analysis and conclusion"
}

Consider:
1. The credibility and trustworthiness of sources
2. Consistency across multiple sources
3. Any contradictory information
4. The quality and relevance of evidence
5. Any potential bias or conflicts of interest

Provide a confidence score from 0.0 to 1.0, where:
- 0.9-1.0: Very high confidence (multiple high-quality sources agree)
- 0.7-0.89: High confidence (good sources with some agreement)
- 0.5-0.69: Medium confidence (mixed or limited evidence)
- 0.3-0.49: Low confidence (weak or contradictory evidence)
- 0.0-0.29: Very low confidence (insufficient or unreliable evidence)
`;
  }

  /**
   * Parse analysis response from the model
   */
  private parseAnalysisResponse(response: string): {
    verdict: FactCheckVerdict;
    confidence: number;
    reasoning: string;
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          verdict: parsed.verdict as FactCheckVerdict,
          confidence: Math.max(0, Math.min(1, parseFloat(parsed.confidence))),
          reasoning: parsed.reasoning || 'No reasoning provided',
        };
      }
    } catch (error) {
      console.warn('Failed to parse analysis response as JSON:', error);
    }

    // Fallback parsing
    const verdict = this.extractVerdictFromText(response);
    const confidence = this.extractConfidenceFromText(response);

    return {
      verdict,
      confidence,
      reasoning: response.substring(0, 500), // Use first part as reasoning
    };
  }

  private extractVerdictFromText(text: string): FactCheckVerdict {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('true') && !lowerText.includes('false')) {
      return FactCheckVerdict.TRUE;
    }
    if (lowerText.includes('false') && !lowerText.includes('true')) {
      return FactCheckVerdict.FALSE;
    }
    if (lowerText.includes('partially') || lowerText.includes('mixed')) {
      return FactCheckVerdict.PARTIALLY_TRUE;
    }
    if (lowerText.includes('disputed') || lowerText.includes('controversial')) {
      return FactCheckVerdict.DISPUTED;
    }
    
    return FactCheckVerdict.INSUFFICIENT_EVIDENCE;
  }

  private extractConfidenceFromText(text: string): number {
    const confidenceMatch = text.match(/confidence[:\s]+(\d*\.?\d+)/i);
    if (confidenceMatch) {
      return Math.max(0, Math.min(1, parseFloat(confidenceMatch[1])));
    }
    
    // Default based on verdict keywords
    if (text.toLowerCase().includes('very confident') || text.toLowerCase().includes('certain')) {
      return 0.9;
    }
    if (text.toLowerCase().includes('confident')) {
      return 0.7;
    }
    if (text.toLowerCase().includes('uncertain') || text.toLowerCase().includes('unclear')) {
      return 0.3;
    }
    
    return 0.5; // Default medium confidence
  }
}

// Tool Schema for easy integration
export const factCheckToolSchema = {
  name: 'fact_check',
  description: 'Verify claims and statements using multiple sources and evidence-based analysis',
  parameters: {
    type: 'object' as const,
    properties: {
      claim: {
        type: 'string' as const,
        description: 'The claim or statement to fact-check',
      },
      context: {
        type: 'string' as const,
        description: 'Optional context or background information',
      },
      sources: {
        type: 'array' as const,
        items: {
          type: 'string' as const,
        },
        description: 'Optional list of specific sources to check',
      },
      options: {
        type: 'object' as const,
        properties: {
          enableWebSearch: {
            type: 'boolean' as const,
            description: 'Enable web search for evidence',
            default: true,
          },
          enableKnowledgeBase: {
            type: 'boolean' as const,
            description: 'Enable knowledge base search for evidence',
            default: true,
          },
          confidenceThreshold: {
            type: 'number' as const,
            description: 'Minimum confidence threshold (0.0-1.0)',
            default: 0.8,
          },
          maxSources: {
            type: 'number' as const,
            description: 'Maximum number of sources to use',
            default: 5,
          },
        },
      },
    },
    required: ['claim'],
  },
};

export default FactCheckTool;