/**
 * Tool Registry and Factory
 * Central registry for all LangChain tools
 */

import { BaseTool } from '@langchain/core/tools';
import { Calculator } from '@langchain/community/tools/calculator';
import { SerpAPI } from '@langchain/community/tools/serpapi';
import { WebBrowser } from 'langchain/tools/webbrowser';
import { RequestsGetTool, RequestsPostTool } from 'langchain/tools/requests';

import { FactCheckTool, factCheckToolSchema } from './fact-check';
import { SearchTool } from './search';
import { AnalyticsTool } from './analytics';
import KnowledgeBaseRetriever from '../retrievers/knowledge-base';
import { ToolDefinition, ToolError } from '../types';

export class ToolRegistry {
  private static tools = new Map<string, BaseTool>();
  private static knowledgeBaseRetriever: KnowledgeBaseRetriever | null = null;

  /**
   * Initialize the tool registry with a knowledge base retriever
   */
  static initialize(knowledgeBaseRetriever: KnowledgeBaseRetriever): void {
    this.knowledgeBaseRetriever = knowledgeBaseRetriever;
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  private static registerDefaultTools(): void {
    // Mathematical calculations
    this.registerTool('calculator', new Calculator());

    // Web browsing and requests
    if (process.env.SERPAPI_API_KEY) {
      this.registerTool('web_search', new SerpAPI(process.env.SERPAPI_API_KEY));
    }

    this.registerTool('web_browser', new WebBrowser({
      model: require('../models').ModelFactory.getActiveModel(),
      embeddings: require('../retrievers/vector-store').default.prototype.embeddings,
    }));

    this.registerTool('http_get', new RequestsGetTool());
    this.registerTool('http_post', new RequestsPostTool());

    // Custom tools
    if (this.knowledgeBaseRetriever) {
      this.registerTool('fact_check', new FactCheckTool(this.knowledgeBaseRetriever));
      this.registerTool('search', new SearchTool(this.knowledgeBaseRetriever));
      this.registerTool('analytics', new AnalyticsTool());
    }
  }

  /**
   * Register a tool
   */
  static registerTool(name: string, tool: BaseTool): void {
    if (this.tools.has(name)) {
      console.warn(`Tool '${name}' is already registered. Overwriting...`);
    }
    this.tools.set(name, tool);
  }

  /**
   * Unregister a tool
   */
  static unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get a specific tool
   */
  static getTool(name: string): BaseTool | null {
    return this.tools.get(name) || null;
  }

  /**
   * Get all tools
   */
  static getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  static getToolsByCategory(category: string): BaseTool[] {
    const categoryTools: Record<string, string[]> = {
      'search': ['web_search', 'search', 'web_browser'],
      'calculation': ['calculator'],
      'verification': ['fact_check'],
      'http': ['http_get', 'http_post'],
      'analytics': ['analytics'],
    };

    const toolNames = categoryTools[category] || [];
    return toolNames.map(name => this.getTool(name)).filter(Boolean) as BaseTool[];
  }

  /**
   * Get tool definitions for agent configuration
   */
  static getToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = [];

    for (const [name, tool] of this.tools) {
      try {
        definitions.push({
          name,
          description: tool.description,
          parameters: this.generateParametersSchema(tool),
          function: async (parameters: Record<string, any>) => {
            try {
              const result = await tool.call(JSON.stringify(parameters));
              return {
                success: true,
                data: result,
              };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          },
        });
      } catch (error) {
        console.warn(`Failed to create definition for tool '${name}':`, error);
      }
    }

    return definitions;
  }

  /**
   * Generate parameters schema for a tool
   */
  private static generateParametersSchema(tool: BaseTool): ToolDefinition['parameters'] {
    // Special handling for known tools
    if (tool instanceof FactCheckTool) {
      return factCheckToolSchema.parameters as ToolDefinition['parameters'];
    }

    if (tool instanceof Calculator) {
      return {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to calculate',
          },
        },
        required: ['expression'],
      };
    }

    if (tool instanceof SerpAPI) {
      return {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      };
    }

    // Generic schema for unknown tools
    return {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Tool input',
        },
      },
      required: ['input'],
    };
  }

  /**
   * Validate tool configuration
   */
  static validateToolConfiguration(): {
    valid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if essential tools are available
    const essentialTools = ['calculator', 'search'];
    for (const toolName of essentialTools) {
      if (!this.tools.has(toolName)) {
        issues.push(`Essential tool '${toolName}' is not registered`);
      }
    }

    // Check API key requirements
    if (!process.env.SERPAPI_API_KEY && !this.tools.has('web_search')) {
      recommendations.push('Consider adding SERPAPI_API_KEY for web search capabilities');
    }

    if (!this.knowledgeBaseRetriever) {
      issues.push('Knowledge base retriever not initialized');
    }

    // Check for duplicate tool names
    const toolNames = Array.from(this.tools.keys());
    const duplicates = toolNames.filter((name, index) => toolNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      issues.push(`Duplicate tool names found: ${duplicates.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get tool statistics
   */
  static getStatistics(): {
    totalTools: number;
    categories: Record<string, number>;
    toolList: Array<{
      name: string;
      description: string;
      category: string;
    }>;
  } {
    const toolList = Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      category: this.categorizetool(name),
    }));

    const categories = toolList.reduce((acc, tool) => {
      acc[tool.category] = (acc[tool.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTools: this.tools.size,
      categories,
      toolList,
    };
  }

  /**
   * Categorize a tool by its name
   */
  private static categorizeTools(name: string): string {
    if (name.includes('search') || name.includes('browser')) return 'search';
    if (name.includes('calc')) return 'calculation';
    if (name.includes('fact') || name.includes('verify')) return 'verification';
    if (name.includes('http') || name.includes('request')) return 'http';
    if (name.includes('analyt')) return 'analytics';
    return 'general';
  }

  /**
   * Test all tools
   */
  static async testAllTools(): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      tool: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    for (const [name, tool] of this.tools) {
      try {
        // Simple test based on tool type
        let testInput = '';
        
        if (name === 'calculator') {
          testInput = '2 + 2';
        } else if (name.includes('search')) {
          testInput = 'test query';
        } else if (name === 'fact_check') {
          testInput = JSON.stringify({ claim: 'The sky is blue' });
        } else {
          testInput = 'test';
        }

        await tool.call(testInput);
        results.push({ tool: name, success: true });
        passed++;
      } catch (error) {
        results.push({
          tool: name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { passed, failed, results };
  }

  /**
   * Clear all tools
   */
  static clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool count
   */
  static getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Check if tool exists
   */
  static hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  private static categorizeTools(name: string): string {
    if (name.includes('search') || name.includes('browser')) return 'search';
    if (name.includes('calc')) return 'calculation';
    if (name.includes('fact') || name.includes('verify')) return 'verification';
    if (name.includes('http') || name.includes('request')) return 'http';
    if (name.includes('analyt')) return 'analytics';
    return 'general';
  }
}

// Export default instance
export default ToolRegistry;

// Export tool classes for direct use
export { FactCheckTool, factCheckToolSchema };
export * from './search';
export * from './analytics';