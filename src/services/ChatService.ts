/**
 * ChatService - Frontend service for chat API communication
 * Handles message sending, conversation retrieval, and error handling
 */

import { config } from '../config/env';
import type { ChatMessage, Source, GraphData } from '../components/chat/types';

export interface SendMessageRequest {
  message: string;
  conversationId?: string;
  includeGraph?: boolean;
}

export interface SendMessageResponse {
  answer: string;
  sources: Source[];
  conversationId: string;
  queryType: 'semantic' | 'structural' | 'hybrid' | 'exact';
  graphData?: GraphData;
}

export interface ConversationResponse {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ClearConversationResponse {
  success: boolean;
  message: string;
}

export class ChatServiceError extends Error {
  statusCode?: number;
  details?: any;

  constructor(
    message: string,
    statusCode?: number,
    details?: any
  ) {
    super(message);
    this.name = 'ChatServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ChatService {
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.proxyUrl;
  }

  /**
   * Send a chat message and receive a response
   */
  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    return this.fetchWithRetry(
      `${this.baseUrl}/api/chat/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      }
    );
  }

  /**
   * Retrieve a conversation by ID
   */
  async getConversation(conversationId: string): Promise<ConversationResponse> {
    return this.fetchWithRetry(
      `${this.baseUrl}/api/chat/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Clear a conversation
   */
  async clearConversation(conversationId: string): Promise<ClearConversationResponse> {
    return this.fetchWithRetry(
      `${this.baseUrl}/api/chat/conversations/${conversationId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  /**
   * Fetch with retry logic for transient failures
   */
  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, options, attempt + 1);
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, options, attempt + 1);
      }

      // Parse response
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        throw new ChatServiceError(
          data.error?.message || `Request failed with status ${response.status}`,
          response.status,
          data.error?.details
        );
      }

      return data as T;
    } catch (error: any) {
      // Handle network errors
      if (error.name === 'AbortError') {
        throw new ChatServiceError('Request timeout', 408);
      }

      if (error instanceof ChatServiceError) {
        throw error;
      }

      // Retry on network errors
      if (attempt < this.maxRetries && this.isNetworkError(error)) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
        return this.fetchWithRetry<T>(url, options, attempt + 1);
      }

      throw new ChatServiceError(
        error.message || 'Network error occurred',
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Check if error is a network error that should be retried
   */
  private isNetworkError(error: any): boolean {
    return (
      error.name === 'TypeError' ||
      error.message?.includes('fetch') ||
      error.message?.includes('network')
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const chatService = new ChatService();
