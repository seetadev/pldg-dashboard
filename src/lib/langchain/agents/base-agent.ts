/**
 * Base Agent Implementation
 * Powerful agent setup with OpenAI/Anthropic support, memory, and tool integration
 */

import { 
  AgentExecutor,
  createOpenAIFunctionsAgent,
  createToolCallingAgent,
} from 'langchain/agents';
import { 
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { BufferMemory, ConversationSummaryMemory } from 'langchain/memory';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { BaseTool } from '@langchain/core/tools';
import { RunnableSequence } from '@langchain/core/runnables';
import { CallbackManager } from '@langchain/core/callbacks/manager';

import { ModelFactory } from '../models';
import { langChainConfig, ModelProvider } from '../config';
import {
  AgentConfig,
  AgentResponse,
  ConversationMemory,
  ConversationMessage,
  AgentStep,
  ResponseMetadata,
  ModelError,
  LangChainError,
} from '../types';

export class BaseAgent {
  private executor: AgentExecutor | null = null;
  private memory: BufferMemory | ConversationSummaryMemory;
  private model: BaseLanguageModel;
  private tools: BaseTool[] = [];
  private config: AgentConfig;
  private conversationHistory: ConversationMessage[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.model = ModelFactory.getModelByProvider(config.model.provider as ModelProvider);
    this.memory = this.initializeMemory();
    this.setupAgent();
  }

  /**
   * Initialize memory based on configuration
   */
  private initializeMemory(): BufferMemory | ConversationSummaryMemory {
    const { memory } = this.config;
    
    if (memory.type === 'summary') {
      return new ConversationSummaryMemory({
        llm: this.model,
        maxTokenLimit: memory.maxTokens,
        returnMessages: true,
        memoryKey: 'chat_history',
      });
    }
    
    // Default to buffer memory
    return new BufferMemory({
      returnMessages: true,
      memoryKey: 'chat_history',
      inputKey: 'input',
      outputKey: 'output',
    });
  }

  /**
   * Setup the agent with tools and prompts
   */
  private async setupAgent(): Promise<void> {
    try {
      // Create the prompt template
      const prompt = this.createPromptTemplate();
      
      // Create agent based on model type
      let agent;
      if (this.config.model.provider === ModelProvider.OPENAI) {
        agent = await createOpenAIFunctionsAgent({
          llm: this.model,
          tools: this.tools,
          prompt,
        });
      } else {
        // Use tool calling agent for Anthropic
        agent = await createToolCallingAgent({
          llm: this.model,
          tools: this.tools,
          prompt,
        });
      }

      // Create executor
      this.executor = new AgentExecutor({
        agent,
        tools: this.tools,
        memory: this.memory,
        maxIterations: langChainConfig.agent.maxIterations,
        verbose: langChainConfig.agent.verbose,
        returnIntermediateSteps: true,
        earlyStoppingMethod: 'generate',
        handleParsingErrors: true,
        callbacks: this.createCallbacks(),
      });

    } catch (error) {
      throw new ModelError(
        `Failed to setup agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { config: this.config.name, error }
      );
    }
  }

  /**
   * Create prompt template for the agent
   */
  private createPromptTemplate(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      SystemMessagePromptTemplate.fromTemplate(this.config.systemPrompt),
      new MessagesPlaceholder('chat_history'),
      HumanMessagePromptTemplate.fromTemplate('{input}'),
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
  }

  /**
   * Create callback manager for monitoring
   */
  private createCallbacks(): CallbackManager {
    return CallbackManager.fromHandlers({
      handleAgentAction: async (action, runId) => {
        if (langChainConfig.agent.verbose) {
          console.log(`[Agent] Action: ${action.tool} - ${action.toolInput}`);
        }
      },
      handleAgentEnd: async (action, runId) => {
        if (langChainConfig.agent.verbose) {
          console.log(`[Agent] Finished: ${action.returnValues.output}`);
        }
      },
      handleToolStart: async (tool, input, runId) => {
        if (langChainConfig.agent.verbose) {
          console.log(`[Tool] Starting: ${tool.name}`);
        }
      },
      handleToolEnd: async (output, runId) => {
        if (langChainConfig.agent.verbose) {
          console.log(`[Tool] Output: ${output}`);
        }
      },
      handleLLMStart: async (llm, prompts, runId) => {
        if (langChainConfig.agent.verbose) {
          console.log(`[LLM] Starting with ${prompts.length} prompts`);
        }
      },
      handleLLMEnd: async (output, runId) => {
        if (langChainConfig.agent.verbose) {
          console.log(`[LLM] Generated response`);
        }
      },
    });
  }

  /**
   * Add tools to the agent
   */
  public addTools(tools: BaseTool[]): void {
    this.tools.push(...tools);
    // Re-setup agent with new tools
    this.setupAgent();
  }

  /**
   * Remove a tool from the agent
   */
  public removeTool(toolName: string): void {
    this.tools = this.tools.filter(tool => tool.name !== toolName);
    this.setupAgent();
  }

  /**
   * Execute a query with the agent
   */
  public async execute(
    input: string, 
    context?: Record<string, any>
  ): Promise<AgentResponse> {
    if (!this.executor) {
      throw new LangChainError('Agent executor not initialized', 'AGENT_NOT_READY');
    }

    const startTime = Date.now();
    let agentSteps: AgentStep[] = [];

    try {
      // Add context to memory if provided
      if (context) {
        await this.addContext(context);
      }

      // Execute the agent
      const result = await this.executor.invoke(
        { input },
        {
          timeout: this.config.model.timeout,
          callbacks: this.createCallbacks(),
        }
      );

      // Extract intermediate steps
      if (result.intermediateSteps) {
        agentSteps = result.intermediateSteps.map((step, index) => ({
          step: index + 1,
          action: step.action.tool || 'unknown',
          observation: String(step.observation),
          reasoning: step.action.toolInput ? JSON.stringify(step.action.toolInput) : '',
          toolUsed: step.action.tool,
        }));
      }

      // Store conversation
      this.addToConversationHistory({
        role: 'user',
        content: input,
        timestamp: new Date(),
      });

      this.addToConversationHistory({
        role: 'assistant',
        content: result.output,
        timestamp: new Date(),
        metadata: { steps: agentSteps.length },
      });

      const executionTime = Date.now() - startTime;

      return {
        content: result.output,
        confidence: this.calculateConfidence(result, agentSteps),
        sources: [], // Will be populated by specific implementations
        reasoning: this.extractReasoning(agentSteps),
        metadata: {
          model: this.config.model.modelName,
          tokenUsage: {
            prompt: 0, // TODO: Extract from callback
            completion: 0,
            total: 0,
          },
          executionTime,
          timestamp: new Date(),
          agentSteps,
        },
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      throw new LangChainError(
        `Agent execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXECUTION_ERROR',
        {
          input,
          executionTime,
          agentSteps,
          context,
        }
      );
    }
  }

  /**
   * Execute with streaming response
   */
  public async *executeStream(
    input: string,
    context?: Record<string, any>
  ): AsyncIterableIterator<Partial<AgentResponse>> {
    if (!this.executor) {
      throw new LangChainError('Agent executor not initialized', 'AGENT_NOT_READY');
    }

    const startTime = Date.now();
    
    try {
      if (context) {
        await this.addContext(context);
      }

      // Use streaming model
      const streamingModel = ModelFactory.getStreamingModel(
        this.config.model.provider as ModelProvider
      );
      
      // Create a streaming version of the agent
      const streamingAgent = await this.createStreamingAgent(streamingModel);
      
      for await (const chunk of streamingAgent.stream({ input })) {
        yield {
          content: chunk.content || '',
          confidence: 0.5, // Intermediate confidence
          sources: [],
          metadata: {
            model: this.config.model.modelName,
            tokenUsage: { prompt: 0, completion: 0, total: 0 },
            executionTime: Date.now() - startTime,
            timestamp: new Date(),
          },
        };
      }

    } catch (error) {
      throw new LangChainError(
        `Streaming execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAMING_ERROR',
        { input, context }
      );
    }
  }

  /**
   * Create streaming agent
   */
  private async createStreamingAgent(streamingModel: BaseLanguageModel) {
    const prompt = this.createPromptTemplate();
    
    return RunnableSequence.from([
      {
        input: (input: any) => input.input,
        chat_history: async () => {
          const history = await this.memory.loadMemoryVariables({});
          return history.chat_history || [];
        },
      },
      prompt,
      streamingModel,
    ]);
  }

  /**
   * Add context to conversation
   */
  private async addContext(context: Record<string, any>): Promise<void> {
    const contextMessage = `Context: ${JSON.stringify(context, null, 2)}`;
    await this.memory.saveContext(
      { input: contextMessage },
      { output: 'Context received' }
    );
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(result: any, steps: AgentStep[]): number {
    // Simple heuristic - can be improved with more sophisticated methods
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for more steps (might indicate uncertainty)
    if (steps.length > 3) {
      confidence -= 0.1 * (steps.length - 3);
    }
    
    // Increase confidence if tools were used successfully
    const successfulTools = steps.filter(step => 
      !step.observation.toLowerCase().includes('error')
    );
    confidence += 0.05 * successfulTools.length;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Extract reasoning from agent steps
   */
  private extractReasoning(steps: AgentStep[]): string {
    if (steps.length === 0) return 'Direct response without tool usage';
    
    return steps.map(step => 
      `Step ${step.step}: Used ${step.toolUsed} - ${step.reasoning}`
    ).join('\n');
  }

  /**
   * Add message to conversation history
   */
  private addToConversationHistory(message: ConversationMessage): void {
    this.conversationHistory.push(message);
    
    // Keep only last N messages to prevent memory overflow
    const maxMessages = langChainConfig.agent.memorySize;
    if (this.conversationHistory.length > maxMessages) {
      this.conversationHistory = this.conversationHistory.slice(-maxMessages);
    }
  }

  /**
   * Get conversation memory
   */
  public getConversationMemory(): ConversationMemory {
    return {
      messages: this.conversationHistory,
      tokenCount: this.conversationHistory.reduce(
        (total, msg) => total + (msg.content.length / 4), // Rough token estimate
        0
      ),
    };
  }

  /**
   * Clear conversation memory
   */
  public async clearMemory(): Promise<void> {
    await this.memory.clear();
    this.conversationHistory = [];
  }

  /**
   * Get agent configuration
   */
  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update system prompt
   */
  public async updateSystemPrompt(newPrompt: string): Promise<void> {
    this.config.systemPrompt = newPrompt;
    await this.setupAgent();
  }

  /**
   * Get available tools
   */
  public getAvailableTools(): string[] {
    return this.tools.map(tool => tool.name);
  }

  /**
   * Health check for the agent
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }> {
    try {
      const modelConnected = await ModelFactory.testConnection(
        this.config.model.provider as ModelProvider
      );
      
      return {
        status: modelConnected ? 'healthy' : 'unhealthy',
        details: {
          modelProvider: this.config.model.provider,
          modelName: this.config.model.modelName,
          toolsCount: this.tools.length,
          memoryType: this.config.memory.type,
          conversationLength: this.conversationHistory.length,
          modelConnected,
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
}

export default BaseAgent;