import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Simple logger utility to reduce console.log in production
export class Logger {
  private static enabled: boolean = typeof window !== 'undefined' && 
    (process.env.NODE_ENV === 'development' || 
     localStorage.getItem('debugLogging') === 'true');

  static debug(...args: any[]): void {
    if (this.enabled) {
      console.debug('[DEBUG]', ...args);
    }
  }

  static info(...args: any[]): void {
    if (this.enabled) {
      console.info('[INFO]', ...args);
    }
  }

  static warn(...args: any[]): void {
    if (this.enabled) {
      console.warn('[WARN]', ...args);
    }
  }

  static error(...args: any[]): void {
    // Always show errors, even in production
    console.error('[ERROR]', ...args);
  }

  static enableDebug(): void {
    this.enabled = true;
    localStorage.setItem('debugLogging', 'true');
  }

  static disableDebug(): void {
    this.enabled = false;
    localStorage.removeItem('debugLogging');
  }

  static isEnabled(): boolean {
    return this.enabled;
  }
}

// Helper function for conditional logging in development
export function debugLog(...args: any[]): void {
  Logger.debug(...args);
}

export function infoLog(...args: any[]): void {
  Logger.info(...args);
}

export function warnLog(...args: any[]): void {
  Logger.warn(...args);
}

export function errorLog(...args: any[]): void {
  Logger.error(...args);
}