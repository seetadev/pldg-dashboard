/**
 * Model Factory and Management
 * Handles initialization of different LLM providers (OpenAI, Anthropic)
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { langChainConfig, ModelProvider, getActiveModelProvider } from '../config';
import { ModelError } from '../types';

export class ModelFactory {
  private static openAIInstance: ChatOpenAI | null = null;
  private static anthropicInstance: ChatAnthropic | null = null;

  /**
   * Get OpenAI model instance
   */
  static getOpenAIModel(): ChatOpenAI {
    if (!this.openAIInstance) {
      try {
        this.openAIInstance = new ChatOpenAI({
          openAIApiKey: langChainConfig.openai.apiKey,
          modelName: langChainConfig.openai.model,
          temperature: langChainConfig.openai.temperature,
          maxTokens: langChainConfig.openai.maxTokens,
          maxRetries: langChainConfig.openai.maxRetries,
          timeout: 30000,
          verbose: langChainConfig.agent.verbose,
        });
      } catch (error) {
        throw new ModelError(
          'Failed to initialize OpenAI model',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
    }
    return this.openAIInstance;
  }

  /**
   * Get Anthropic model instance
   */
  static getAnthropicModel(): ChatAnthropic {
    if (!this.anthropicInstance) {
      try {
        this.anthropicInstance = new ChatAnthropic({
          anthropicApiKey: langChainConfig.anthropic.apiKey,
          modelName: langChainConfig.anthropic.model,
          temperature: langChainConfig.anthropic.temperature,
          maxTokens: langChainConfig.anthropic.maxTokens,
          maxRetries: langChainConfig.anthropic.maxRetries,
          timeout: 30000,
          verbose: langChainConfig.agent.verbose,
        });
      } catch (error) {
        throw new ModelError(
          'Failed to initialize Anthropic model',
          { error: error instanceof Error ? error.message : 'Unknown error' }
        );
      }
    }
    return this.anthropicInstance;
  }

  /**
   * Get the active model based on configuration
   */
  static getActiveModel(): BaseLanguageModel {
    const activeProvider = getActiveModelProvider();
    
    switch (activeProvider) {
      case ModelProvider.ANTHROPIC:
        return this.getAnthropicModel();
      case ModelProvider.OPENAI:
      default:
        return this.getOpenAIModel();
    }
  }

  /**
   * Get model by provider
   */
  static getModelByProvider(provider: ModelProvider): BaseLanguageModel {
    switch (provider) {
      case ModelProvider.ANTHROPIC:
        return this.getAnthropicModel();
      case ModelProvider.OPENAI:
        return this.getOpenAIModel();
      default:
        throw new ModelError(`Unsupported model provider: ${provider}`);
    }
  }

  /**
   * Get streaming model
   */
  static getStreamingModel(provider?: ModelProvider): BaseLanguageModel {
    const modelProvider = provider || getActiveModelProvider();
    const model = this.getModelByProvider(modelProvider);
    
    // Enable streaming for the model
    if (model instanceof ChatOpenAI) {
      return new ChatOpenAI({
        ...model.kwargs,
        streaming: true,
      });
    }
    
    if (model instanceof ChatAnthropic) {
      return new ChatAnthropic({
        ...model.kwargs,
        streaming: true,
      });
    }

    return model;
  }

  /**
   * Test model connectivity
   */
  static async testConnection(provider?: ModelProvider): Promise<boolean> {
    try {
      const model = provider ? this.getModelByProvider(provider) : this.getActiveModel();
      const response = await model.invoke('Test connection');
      return response.content.length > 0;
    } catch (error) {
      console.error(`Model connection test failed:`, error);
      return false;
    }
  }

  /**
   * Get model info
   */
  static getModelInfo(provider?: ModelProvider): {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  } {
    const activeProvider = provider || getActiveModelProvider();
    
    switch (activeProvider) {
      case ModelProvider.ANTHROPIC:
        return {
          provider: 'anthropic',
          model: langChainConfig.anthropic.model,
          temperature: langChainConfig.anthropic.temperature,
          maxTokens: langChainConfig.anthropic.maxTokens,
        };
      case ModelProvider.OPENAI:
      default:
        return {
          provider: 'openai',
          model: langChainConfig.openai.model,
          temperature: langChainConfig.openai.temperature,
          maxTokens: langChainConfig.openai.maxTokens,
        };
    }
  }

  /**
   * Clear cached instances (useful for testing or config changes)
   */
  static clearCache(): void {
    this.openAIInstance = null;
    this.anthropicInstance = null;
  }
}

/**
 * Model utilities
 */
export class ModelUtils {
  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit
   */
  static truncateToTokenLimit(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokens(text);
    if (estimatedTokens <= maxTokens) {
      return text;
    }
    
    const maxChars = maxTokens * 4;
    return text.substring(0, maxChars - 3) + '...';
  }

  /**
   * Format system prompt with dynamic variables
   */
  static formatSystemPrompt(template: string, variables: Record<string, string>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(variables)) {
      formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return formatted;
  }

  /**
   * Calculate cost estimation (approximate)
   */
  static estimateCost(
    promptTokens: number,
    completionTokens: number,
    provider: ModelProvider
  ): number {
    // Approximate pricing (as of 2024, subject to change)
    const pricing = {
      [ModelProvider.OPENAI]: {
        prompt: 0.00001, // $0.01 per 1K tokens
        completion: 0.00003, // $0.03 per 1K tokens
      },
      [ModelProvider.ANTHROPIC]: {
        prompt: 0.000008, // $0.008 per 1K tokens
        completion: 0.000024, // $0.024 per 1K tokens
      },
    };

    const rates = pricing[provider];
    return (promptTokens * rates.prompt) + (completionTokens * rates.completion);
  }
}

// Export singleton instance
export const modelFactory = ModelFactory;