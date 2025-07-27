/**
 * Analytics Tool Implementation
 * Provides analytical capabilities for data processing and insights
 */

import { Tool } from '@langchain/core/tools';
import { ToolError } from '../types';

export class AnalyticsTool extends Tool {
  name = 'analytics';
  description = 'Perform analytical operations on data including statistics, trends, and insights';

  async _call(input: string): Promise<string> {
    try {
      const request = this.parseAnalyticsInput(input);
      const result = await this.performAnalysis(request);
      return JSON.stringify(result);
    } catch (error) {
      throw new ToolError(
        `Analytics operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { input }
      );
    }
  }

  private parseAnalyticsInput(input: string): {
    operation: string;
    data: any;
    options?: any;
  } {
    try {
      return JSON.parse(input);
    } catch {
      return {
        operation: 'summary',
        data: input,
      };
    }
  }

  private async performAnalysis(request: {
    operation: string;
    data: any;
    options?: any;
  }): Promise<any> {
    switch (request.operation) {
      case 'summary':
        return this.calculateSummaryStatistics(request.data);
      case 'trend':
        return this.analyzeTrend(request.data);
      case 'correlation':
        return this.calculateCorrelation(request.data);
      case 'frequency':
        return this.analyzeFrequency(request.data);
      default:
        throw new Error(`Unsupported analytics operation: ${request.operation}`);
    }
  }

  private calculateSummaryStatistics(data: number[]): any {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array of numbers');
    }

    const numbers = data.filter(x => typeof x === 'number' && !isNaN(x));
    if (numbers.length === 0) {
      throw new Error('No valid numbers found in data');
    }

    const sorted = numbers.sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    const variance = numbers.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / numbers.length;

    return {
      count: numbers.length,
      sum,
      mean,
      median: this.calculateMedian(sorted),
      mode: this.calculateMode(numbers),
      min: Math.min(...numbers),
      max: Math.max(...numbers),
      range: Math.max(...numbers) - Math.min(...numbers),
      variance,
      standardDeviation: Math.sqrt(variance),
      quartiles: this.calculateQuartiles(sorted),
    };
  }

  private calculateMedian(sortedNumbers: number[]): number {
    const mid = Math.floor(sortedNumbers.length / 2);
    return sortedNumbers.length % 2 === 0
      ? (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2
      : sortedNumbers[mid];
  }

  private calculateMode(numbers: number[]): number | null {
    const frequency: Record<number, number> = {};
    let maxFreq = 0;
    let modes: number[] = [];

    numbers.forEach(num => {
      frequency[num] = (frequency[num] || 0) + 1;
      if (frequency[num] > maxFreq) {
        maxFreq = frequency[num];
        modes = [num];
      } else if (frequency[num] === maxFreq && !modes.includes(num)) {
        modes.push(num);
      }
    });

    return maxFreq > 1 ? modes[0] : null;
  }

  private calculateQuartiles(sortedNumbers: number[]): {
    q1: number;
    q2: number;
    q3: number;
  } {
    const q2 = this.calculateMedian(sortedNumbers);
    const mid = Math.floor(sortedNumbers.length / 2);
    
    const lowerHalf = sortedNumbers.slice(0, mid);
    const upperHalf = sortedNumbers.slice(sortedNumbers.length % 2 === 0 ? mid : mid + 1);
    
    return {
      q1: this.calculateMedian(lowerHalf),
      q2,
      q3: this.calculateMedian(upperHalf),
    };
  }

  private analyzeTrend(data: Array<{ x: number; y: number }> | number[]): any {
    let points: Array<{ x: number; y: number }>;

    if (Array.isArray(data) && data.every(item => typeof item === 'number')) {
      points = (data as number[]).map((y, x) => ({ x, y }));
    } else if (Array.isArray(data) && data.every(item => typeof item === 'object' && 'x' in item && 'y' in item)) {
      points = data as Array<{ x: number; y: number }>;
    } else {
      throw new Error('Data must be an array of numbers or objects with x, y properties');
    }

    if (points.length < 2) {
      throw new Error('At least 2 data points are required for trend analysis');
    }

    // Calculate linear regression
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
    const denomX = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));
    const denomY = Math.sqrt(points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0));
    const correlation = numerator / (denomX * denomY);

    return {
      slope,
      intercept,
      correlation,
      equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
      trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      strength: Math.abs(correlation) > 0.8 ? 'strong' : Math.abs(correlation) > 0.5 ? 'moderate' : 'weak',
      rSquared: correlation * correlation,
    };
  }

  private calculateCorrelation(data: {
    x: number[];
    y: number[];
  }): any {
    const { x, y } = data;

    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length === 0) {
      throw new Error('Data must contain two arrays of equal length');
    }

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = y.reduce((a, b) => a + b) / n;

    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));

    const correlation = numerator / (denomX * denomY);

    return {
      correlation,
      strength: Math.abs(correlation) > 0.8 ? 'strong' : Math.abs(correlation) > 0.5 ? 'moderate' : 'weak',
      direction: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none',
      significance: Math.abs(correlation) > 0.7 ? 'significant' : 'not significant',
    };
  }

  private analyzeFrequency(data: any[]): any {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const frequency: Record<string, number> = {};
    const total = data.length;

    data.forEach(item => {
      const key = String(item);
      frequency[key] = (frequency[key] || 0) + 1;
    });

    const entries = Object.entries(frequency);
    const sorted = entries.sort((a, b) => b[1] - a[1]);

    return {
      total,
      unique: entries.length,
      frequencies: frequency,
      mostCommon: sorted.slice(0, 5).map(([value, count]) => ({
        value,
        count,
        percentage: ((count / total) * 100).toFixed(2),
      })),
      leastCommon: sorted.slice(-5).reverse().map(([value, count]) => ({
        value,
        count,
        percentage: ((count / total) * 100).toFixed(2),
      })),
    };
  }
}