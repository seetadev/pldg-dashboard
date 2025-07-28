/**
 * Agent Service Orchestration
 * High-level service for managing LangChain agents and their operations
 */

import { BaseAgent } from '@/lib/langchain/agents/base-agent';
import KnowledgeBaseRetriever from '@/lib/langchain/retrievers/knowledge-base';
import { ToolRegistry } from '@/lib/langchain/tools';
import { ModelFactory } from '@/lib/langchain/models';
import { langChainConfig, validateEnvironment, ModelProvider } from '@/lib/langchain/config';
import {
  AgentConfig,
  AgentResponse,
  FactCheckRequest,
  FactCheckResult,
  SearchQuery,
  SearchResult,
  Document,
  LangChainError,
  ModelError,
  RetrieverError,
} from '@/lib/langchain/types';

/**
 * Predefined agent configurations
 */
const AGENT_CONFIGS: Record<string, AgentConfig> = {
  general: {
    name: 'General Assistant',
    description: 'A versatile AI assistant capable of answering questions and performing various tasks',
    systemPrompt: `You are a helpful AI assistant with access to various tools including search, calculations, and fact-checking.

Your capabilities include:
- Answering questions using your knowledge and available tools
- Searching through knowledge bases for specific information
- Performing calculations and data analysis
- Fact-checking claims and statements
- Providing well-reasoned and evidence-based responses

Guidelines:
- Always strive for accuracy and cite your sources when possible
- Use tools when they can provide more current or specific information
- Be transparent about your limitations and confidence levels
- Provide clear, concise, and helpful responses
- When fact-checking, consider multiple sources and perspectives

Current date: {{currentDate}}
Available tools: {{availableTools}}`,
    tools: [],
    model: {
      provider: 'openai',
      modelName: langChainConfig.openai.model,
      temperature: 0.7,
      maxTokens: langChainConfig.openai.maxTokens,
      timeout: langChainConfig.openai.maxRetries * 10000,
    },
    memory: {
      type: 'buffer',
      maxTokens: langChainConfig.agent.memorySize * 100,
    },
  },

  researcher: {
    name: 'Research Assistant',
    description: 'Specialized agent for research tasks, fact-checking, and information gathering',
    systemPrompt: `You are a specialized research assistant focused on gathering, verifying, and synthesizing information.

Your primary functions:
- Conducting thorough research on topics using available tools
- Fact-checking claims with multiple sources
- Synthesizing information from various sources
- Providing detailed citations and source references
- Identifying potential biases or limitations in sources

Research methodology:
1. Start with knowledge base search for foundational information
2. Use web search for current events and recent developments
3. Cross-reference information across multiple sources
4. Evaluate source credibility and reliability
5. Present findings with appropriate confidence levels

Quality standards:
- Prioritize accuracy over speed
- Always provide source citations
- Acknowledge uncertainties and limitations
- Present multiple perspectives when relevant
- Use fact-checking tools for controversial claims

Current date: {{currentDate}}
Research focus: {{researchFocus}}`,
    tools: [],
    model: {
      provider: 'anthropic',
      modelName: langChainConfig.anthropic.model,
      temperature: 0.3,
      maxTokens: langChainConfig.anthropic.maxTokens,
      timeout: langChainConfig.anthropic.maxRetries * 15000,
    },
    memory: {
      type: 'summary',
      maxTokens: langChainConfig.agent.memorySize * 150,
    },
  },

  analyst: {
    name: 'Data Analyst',
    description: 'Specialized in data analysis, statistics, and providing insights from data',
    systemPrompt: `You are a data analyst specializing in extracting insights from data and performing statistical analysis.

Your expertise includes:
- Statistical analysis and interpretation
- Data visualization recommendations
- Trend analysis and forecasting
- Correlation and causation analysis
- Performance metrics and KPIs
- Data quality assessment

Analytical approach:
1. Understand the context and objectives
2. Examine data quality and completeness
3. Apply appropriate statistical methods
4. Interpret results in business context
5. Provide actionable recommendations
6. Highlight limitations and assumptions

Communication style:
- Present findings clearly for non-technical audiences
- Use visualizations and examples when helpful
- Quantify confidence levels in conclusions
- Suggest follow-up analyses when relevant

Current date: {{currentDate}}
Analysis focus: {{analysisFocus}}`,
    tools: [],
    model: {
      provider: 'openai',
      modelName: langChainConfig.openai.model,
      temperature: 0.2,
      maxTokens: langChainConfig.openai.maxTokens,
      timeout: langChainConfig.openai.maxRetries * 10000,
    },
    memory: {
      type: 'buffer',
      maxTokens: langChainConfig.agent.memorySize * 120,
    },
  },
};

/**
 * Agent Service Class
 */
export class AgentService {
  private agents: Map<string, BaseAgent> = new Map();
  private knowledgeBaseRetriever: KnowledgeBaseRetriever | null = null;
  private initialized = false;

  /**
   * Initialize the agent service
   */
  async initialize(): Promise<void> {
    try {
      // Validate environment
      const envCheck = validateEnvironment();
      if (!envCheck.isValid) {
        throw new LangChainError(
          `Environment validation failed: ${envCheck.errors.join(', ')}`,
          'ENVIRONMENT_ERROR'
        );
      }

      // Initialize knowledge base retriever
      this.knowledgeBaseRetriever = new KnowledgeBaseRetriever();
      await this.knowledgeBaseRetriever.initialize();

      // Initialize tool registry
      ToolRegistry.initialize(this.knowledgeBaseRetriever);

      // Create and register agents
      await this.createAgents();

      this.initialized = true;
      console.log('Agent service initialized successfully');

    } catch (error) {
      throw new LangChainError(
        `Failed to initialize agent service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR'
      );
    }
  }

  /**
   * Create and configure agents
   */
  private async createAgents(): Promise<void> {
    const tools = ToolRegistry.getAllTools();

    for (const [key, config] of Object.entries(AGENT_CONFIGS)) {
      try {
        // Customize system prompt with dynamic variables
        const customizedConfig = {
          ...config,
          systemPrompt: this.customizeSystemPrompt(config.systemPrompt, {
            currentDate: new Date().toISOString().split('T')[0],
            availableTools: tools.map(t => t.name).join(', '),
            researchFocus: 'Comprehensive and accurate information gathering',
            analysisFocus: 'Statistical rigor and actionable insights',
          }),
          tools: ToolRegistry.getToolDefinitions(),
        };

        const agent = new BaseAgent(customizedConfig);
        agent.addTools(tools);

        this.agents.set(key, agent);
        console.log(`Created agent: ${config.name}`);

      } catch (error) {
        console.error(`Failed to create agent ${key}:`, error);
      }
    }
  }

  /**
   * Customize system prompt with variables
   */
  private customizeSystemPrompt(prompt: string, variables: Record<string, string>): string {
    let customized = prompt;
    for (const [key, value] of Object.entries(variables)) {
      customized = customized.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return customized;
  }

  /**
   * Get an agent by name
   */
  getAgent(name: string): BaseAgent | null {
    this.ensureInitialized();
    return this.agents.get(name) || null;
  }

  /**
   * List available agents
   */
  listAgents(): Array<{ name: string; description: string; status: string }> {
    this.ensureInitialized();
    return Array.from(this.agents.entries()).map(([key, agent]) => ({
      name: key,
      description: agent.getConfig().description,
      status: 'ready',
    }));
  }

  /**
   * Chat with a specific agent
   */
  async chat(
    agentName: string,
    message: string,
    context?: Record<string, any>
  ): Promise<AgentResponse> {
    this.ensureInitialized();

    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new LangChainError(`Agent '${agentName}' not found`, 'AGENT_NOT_FOUND');
    }

    try {
      return await agent.execute(message, context);
    } catch (error) {
      throw new LangChainError(
        `Chat with agent '${agentName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHAT_ERROR',
        { agentName, message, error }
      );
    }
  }

  /**
   * Stream chat with a specific agent
   */
  async *streamChat(
    agentName: string,
    message: string,
    context?: Record<string, any>
  ): AsyncIterableIterator<Partial<AgentResponse>> {
    this.ensureInitialized();

    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new LangChainError(`Agent '${agentName}' not found`, 'AGENT_NOT_FOUND');
    }

    try {
      for await (const chunk of agent.executeStream(message, context)) {
        yield chunk;
      }
    } catch (error) {
      throw new LangChainError(
        `Stream chat with agent '${agentName}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_CHAT_ERROR',
        { agentName, message, error }
      );
    }
  }

  /**
   * Perform fact-checking
   */
  async factCheck(request: FactCheckRequest): Promise<FactCheckResult> {
    this.ensureInitialized();

    const researcher = this.agents.get('researcher');
    if (!researcher) {
      throw new LangChainError('Researcher agent not available', 'AGENT_NOT_FOUND');
    }

    try {
      const factCheckTool = ToolRegistry.getTool('fact_check');
      if (!factCheckTool) {
        throw new LangChainError('Fact-check tool not available', 'TOOL_NOT_FOUND');
      }

      const result = await factCheckTool.call(JSON.stringify(request));
      return JSON.parse(result);

    } catch (error) {
      throw new LangChainError(
        `Fact-checking failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FACT_CHECK_ERROR',
        { request, error }
      );
    }
  }

  /**
   * Search knowledge base
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    this.ensureInitialized();

    if (!this.knowledgeBaseRetriever) {
      throw new RetrieverError('Knowledge base retriever not initialized');
    }

    try {
      return await this.knowledgeBaseRetriever.retrieve(query);
    } catch (error) {
      throw new RetrieverError(
        `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { query }
      );
    }
  }

  /**
   * Add documents to knowledge base
   */
  async addDocuments(documents: Document[]): Promise<void> {
    this.ensureInitialized();

    if (!this.knowledgeBaseRetriever) {
      throw new RetrieverError('Knowledge base retriever not initialized');
    }

    try {
      await this.knowledgeBaseRetriever.addDocuments(documents);
    } catch (error) {
      throw new RetrieverError(
        `Failed to add documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { documentCount: documents.length }
      );
    }
  }

  /**
   * Update documents in knowledge base
   */
  async updateDocuments(documents: Document[]): Promise<void> {
    this.ensureInitialized();

    if (!this.knowledgeBaseRetriever) {
      throw new RetrieverError('Knowledge base retriever not initialized');
    }

    try {
      await this.knowledgeBaseRetriever.updateDocuments(documents);
    } catch (error) {
      throw new RetrieverError(
        `Failed to update documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { documentCount: documents.length }
      );
    }
  }

  /**
   * Delete documents from knowledge base
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    this.ensureInitialized();

    if (!this.knowledgeBaseRetriever) {
      throw new RetrieverError('Knowledge base retriever not initialized');
    }

    try {
      await this.knowledgeBaseRetriever.deleteDocuments(ids);
    } catch (error) {
      throw new RetrieverError(
        `Failed to delete documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { ids }
      );
    }
  }

  /**
   * Clear agent conversation memories
   */
  async clearMemory(agentName?: string): Promise<void> {
    this.ensureInitialized();

    if (agentName) {
      const agent = this.agents.get(agentName);
      if (agent) {
        await agent.clearMemory();
      }
    } else {
      // Clear all agents' memory
      for (const agent of this.agents.values()) {
        await agent.clearMemory();
      }
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      agents: Record<string, any>;
      knowledgeBase: any;
      tools: any;
      models: any;
    };
  }> {
    if (!this.initialized) {
      return {
        status: 'unhealthy',
        details: {
          agents: {},
          knowledgeBase: null,
          tools: null,
          models: null,
        },
      };
    }

    try {
      // Check agent health
      const agentHealth: Record<string, any> = {};
      let healthyAgents = 0;

      for (const [name, agent] of this.agents) {
        const health = await agent.healthCheck();
        agentHealth[name] = health;
        if (health.status === 'healthy') healthyAgents++;
      }

      // Check knowledge base health
      const knowledgeBaseHealth = this.knowledgeBaseRetriever 
        ? await this.knowledgeBaseRetriever.healthCheck()
        : { status: 'unhealthy', details: { error: 'Not initialized' } };

      // Check tool health
      const toolHealth = ToolRegistry.validateToolConfiguration();

      // Check model connectivity
      const modelHealth = {
        openai: await ModelFactory.testConnection(ModelProvider.OPENAI),
        anthropic: await ModelFactory.testConnection(ModelProvider.ANTHROPIC),
      };

      // Determine overall status
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (healthyAgents === 0 || knowledgeBaseHealth.status === 'unhealthy') {
        overallStatus = 'unhealthy';
      } else if (healthyAgents < this.agents.size || !toolHealth.valid) {
        overallStatus = 'degraded';
      }

      return {
        status: overallStatus,
        details: {
          agents: agentHealth,
          knowledgeBase: knowledgeBaseHealth,
          tools: toolHealth,
          models: modelHealth,
        },
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          agents: {},
          knowledgeBase: null,
          tools: null,
          models: null,
        },
      };
    }
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<{
    agents: number;
    tools: number;
    documents: number;
    conversations: number;
    uptime: number;
  }> {
    this.ensureInitialized();

    const stats = await this.knowledgeBaseRetriever?.getStatistics();

    return {
      agents: this.agents.size,
      tools: ToolRegistry.getToolCount(),
      documents: stats?.totalDocuments || 0,
      conversations: Array.from(this.agents.values()).reduce(
        (total, agent) => total + agent.getConversationMemory().messages.length,
        0
      ),
      uptime: Date.now() - (global as any).__startTime || 0,
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Clear all agent memories
      await this.clearMemory();

      // Clear tools
      ToolRegistry.clear();

      // Clear knowledge base if needed
      // await this.knowledgeBaseRetriever?.clear();

      // Clear agents
      this.agents.clear();

      this.initialized = false;
      console.log('Agent service shutdown complete');

    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new LangChainError('Agent service not initialized', 'SERVICE_NOT_INITIALIZED');
    }
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Create and export singleton instance
export const agentService = new AgentService();

// Auto-initialize if not in test environment
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  // Initialize on import, but handle errors gracefully
  agentService.initialize().catch(error => {
    console.error('Failed to auto-initialize agent service:', error);
  });
}

export default agentService;