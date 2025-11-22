/**
 * OpenAI Service for Natural Language to Cypher Query Conversion
 * Integrates with OpenAI API to convert natural language queries into Cypher queries
 */

import { config } from '../config/env';
import { ErrorType, type AppError } from '../types';

/**
 * OpenAI Query Service
 * Handles conversion of natural language to Cypher queries via backend proxy
 */
export class OpenAIService {
  private proxyUrl: string;

  constructor(proxyUrl?: string) {
    this.proxyUrl = proxyUrl || config.proxyUrl;
  }

  /**
   * Generate a Cypher query from a natural language question
   * @param naturalLanguageQuery - The user's question in plain English
   * @param dynamicSchema - Optional dynamic schema from the database
   * @returns Promise resolving to the generated Cypher query
   * @throws AppError if the API call fails or returns invalid data
   */
  async generateCypherQuery(naturalLanguageQuery: string, dynamicSchema?: string): Promise<string> {
    if (!naturalLanguageQuery.trim()) {
      throw this.createError(
        'Query cannot be empty',
        'EMPTY_QUERY'
      );
    }

    try {
      const response = await fetch(`${this.proxyUrl}/api/openai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: naturalLanguageQuery,
          schema: dynamicSchema,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { type: 'UNKNOWN', message: 'Unknown error' } }));
        throw this.createError(
          errorData.error?.message || `Proxy error (status ${response.status})`,
          errorData.error?.type || 'PROXY_ERROR',
          { status: response.status, details: errorData.error?.details }
        );
      }

      const data = await response.json();
      
      if (!data.cypherQuery) {
        throw this.createError(
          'No Cypher query returned from proxy',
          'EMPTY_RESPONSE',
          data
        );
      }

      return data.cypherQuery;
    } catch (error) {
      if (this.isAppError(error)) {
        throw error;
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw this.createError(
          'Network error: Unable to connect to proxy server. Please check your connection.',
          'NETWORK_ERROR',
          error
        );
      }

      throw this.createError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UNKNOWN_ERROR',
        error
      );
    }
  }

  /**
   * Create an AppError with GPT_ERROR type
   */
  private createError(message: string, code: string, details?: any): AppError {
    return {
      type: ErrorType.GPT_ERROR,
      message,
      details: {
        code,
        ...details,
      },
    };
  }

  /**
   * Type guard to check if an error is an AppError
   */
  private isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'type' in error && 'message' in error;
  }
}

// Export singleton instance
export const openAIService = new OpenAIService();
