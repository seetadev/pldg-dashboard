/**
 * Utility Functions and Helpers
 * Common utilities for LangChain operations
 */

import { Logger } from './logger';
import { ErrorHandler, safeExecute } from './error-handler';
import { ValidationError } from '../types';

const logger = Logger.getLogger('utils');

/**
 * Text processing utilities
 */
export class TextUtils {
  /**
   * Clean and normalize text
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .trim();
  }

  /**
   * Extract sentences from text
   */
  static extractSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
  }

  /**
   * Truncate text to specified length
   */
  static truncate(text: string, maxLength: number, suffix = '...'): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Estimate reading time in minutes
   */
  static estimateReadingTime(text: string, wordsPerMinute = 200): number {
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  static extractKeywords(text: string, maxKeywords = 10): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'can', 'may', 'might', 'must', 'shall', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
      'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their'
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Calculate similarity between two texts (simple implementation)
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

/**
 * Data validation utilities
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JSON format
   */
  static isValidJson(text: string): boolean {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize input for safety
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Validate required fields in object
   */
  static validateRequiredFields<T>(
    obj: Partial<T>,
    requiredFields: (keyof T)[]
  ): { isValid: boolean; missingFields: (keyof T)[] } {
    const missingFields = requiredFields.filter(field => !obj[field]);
    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  }
}

/**
 * Performance utilities
 */
export class PerformanceUtils {
  private static timers = new Map<string, number>();

  /**
   * Start timing an operation
   */
  static startTimer(operation: string): void {
    this.timers.set(operation, Date.now());
  }

  /**
   * End timing an operation and return duration
   */
  static endTimer(operation: string): number {
    const startTime = this.timers.get(operation);
    if (!startTime) {
      logger.warn(`Timer '${operation}' was not started`, 'performance');
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(operation);
    return duration;
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        `Operation '${operation}' failed after ${duration}ms`,
        error as Error,
        'performance'
      );
      throw error;
    }
  }

  /**
   * Create a debounced function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Create a throttled function
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

/**
 * Cache utilities
 */
export class CacheUtils {
  private static cache = new Map<string, { data: any; expiry: number }>();

  /**
   * Set cache with expiry
   */
  static set<T>(key: string, data: T, ttlMs: number): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get from cache
   */
  static get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Clear cache
   */
  static clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    size: number;
    expired: number;
    keys: string[];
  } {
    const now = Date.now();
    let expired = 0;
    const validKeys: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        expired++;
      } else {
        validKeys.push(key);
      }
    }

    return {
      size: this.cache.size,
      expired,
      keys: validKeys,
    };
  }
}

/**
 * Async utilities
 */
export class AsyncUtils {
  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute functions with limited concurrency
   */
  static async limitConcurrency<T>(
    tasks: (() => Promise<T>)[],
    limit: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const task of tasks) {
      const promise = task().then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= limit) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Timeout wrapper for promises
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /**
   * Retry with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      backoffFactor?: number;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }
}

/**
 * Security utilities
 */
export class SecurityUtils {
  /**
   * Hash string using simple algorithm (for non-cryptographic purposes)
   */
  static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Generate random ID
   */
  static generateId(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Mask sensitive data
   */
  static maskSensitiveData(data: string, visibleChars = 4): string {
    if (data.length <= visibleChars) return '*'.repeat(data.length);
    return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
  }

  /**
   * Check for potential security issues in text
   */
  static checkForSecurityIssues(text: string): {
    hasSecurityIssues: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check for potential XSS
    if (/<script/i.test(text)) {
      issues.push('Potential XSS: Script tag detected');
    }

    // Check for potential SQL injection
    if (/('|(--)|(\|)|(%27)|(%2D%2D)|(%7C))/i.test(text)) {
      issues.push('Potential SQL injection: Suspicious characters detected');
    }

    // Check for potential command injection
    if (/(\||;|`|\$\(|\$\{)/i.test(text)) {
      issues.push('Potential command injection: Shell characters detected');
    }

    return {
      hasSecurityIssues: issues.length > 0,
      issues,
    };
  }
}

/**
 * File utilities
 */
export class FileUtils {
  /**
   * Get file extension
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file type is supported
   */
  static isSupportedFileType(filename: string, supportedTypes: string[]): boolean {
    const extension = this.getFileExtension(filename);
    return supportedTypes.includes(extension);
  }

  /**
   * Format file size
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Validate file size
   */
  static validateFileSize(size: number, maxSizeMB: number): boolean {
    return size <= maxSizeMB * 1024 * 1024;
  }
}

/**
 * Date utilities
 */
export class DateUtils {
  /**
   * Format date for display
   */
  static formatDate(date: Date, format = 'YYYY-MM-DD'): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * Get relative time string
   */
  static getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return this.formatDate(date);
  }

  /**
   * Check if date is within range
   */
  static isWithinRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }
}

// Export all utilities
export {
  Logger,
  ErrorHandler,
  safeExecute,
  ValidationError,
};

// Convenience function to get all utilities
export function getAllUtils() {
  return {
    TextUtils,
    ValidationUtils,
    PerformanceUtils,
    CacheUtils,
    AsyncUtils,
    SecurityUtils,
    FileUtils,
    DateUtils,
  };
}

export default {
  TextUtils,
  ValidationUtils,
  PerformanceUtils,
  CacheUtils,
  AsyncUtils,
  SecurityUtils,
  FileUtils,
  DateUtils,
};