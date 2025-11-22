/**
 * Neo4j Service
 * Handles all interactions with the Neo4j database through the backend proxy
 */

import type { GraphData, AppError } from '../types';
import { ErrorType } from '../types';
import { config } from '../config/env';

export class Neo4jService {
  private proxyUrl: string;
  private isConnected: boolean = false;
  private isQueryRunning: boolean = false;
  private abortController: AbortController | null = null;
  private statisticsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.proxyUrl = config.proxyUrl;
  }

  /**
   * Initialize connection (no-op for proxy, connection handled by backend)
   */
  async connect(): Promise<void> {
    try {
      // Verify proxy is reachable
      const response = await fetch(`${this.proxyUrl}/health`);
      if (response.ok) {
        this.isConnected = true;
      } else {
        throw new Error('Proxy health check failed');
      }
    } catch (error) {
      this.isConnected = false;
      console.error('Connection error details:', error);
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Failed to connect to backend proxy',
        error
      );
    }
  }

  /**
   * Execute a Cypher query and return graph data
   */
  async executeQuery(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<GraphData> {
    if (!this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to backend proxy'
      );
    }

    this.isQueryRunning = true;
    this.abortController = new AbortController();
    
    try {
      const response = await fetch(`${this.proxyUrl}/api/neo4j/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cypher, params }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.createProxyError(error);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw this.createError(
          ErrorType.QUERY_ERROR,
          'Query was cancelled',
          error
        );
      }
      throw error;
    } finally {
      this.isQueryRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Stop the currently running query
   */
  async stopQuery(): Promise<void> {
    if (this.abortController && this.isQueryRunning) {
      try {
        this.abortController.abort();
        this.isQueryRunning = false;
      } catch (error) {
        console.error('Error stopping query:', error);
        throw this.createError(
          ErrorType.QUERY_ERROR,
          'Failed to stop query',
          error
        );
      }
    }
  }

  /**
   * Check if a query is currently running
   */
  isExecuting(): boolean {
    return this.isQueryRunning;
  }

  /**
   * Expand a node by fetching its connected nodes and relationships
   */
  async expandNode(nodeId: string): Promise<GraphData> {
    if (!this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to backend proxy'
      );
    }

    try {
      console.log('Expanding node with ID:', nodeId);
      const response = await fetch(`${this.proxyUrl}/api/neo4j/expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.createProxyError(error);
      }

      const result = await response.json();
      console.log('Expand query returned:', {
        nodes: result.nodes.length,
        relationships: result.relationships.length
      });
      return result;
    } catch (error) {
      throw this.createError(
        ErrorType.QUERY_ERROR,
        `Failed to expand node ${nodeId}`,
        error
      );
    }
  }

  /**
   * Get nodes by label for taxonomy filtering
   */
  async getNodesByLabel(label: string, limit: number = 50): Promise<GraphData> {
    // Sanitize label to prevent injection
    const sanitizedLabel = label.replace(/[^a-zA-Z0-9_]/g, '');
    
    const cypher = `
      MATCH (n:\`${sanitizedLabel}\`)
      RETURN n
      LIMIT $limit
    `;
    
    try {
      return await this.executeQuery(cypher, { limit });
    } catch (error) {
      throw this.createError(
        ErrorType.QUERY_ERROR,
        `Failed to fetch nodes with label ${label}`,
        error
      );
    }
  }

  /**
   * Fetch the database schema including node labels, properties, and relationship types
   */
  async getSchema(): Promise<{ nodeLabels: string[]; relationshipTypes: string[]; schema: string }> {
    if (!this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to backend proxy'
      );
    }

    try {
      const response = await fetch(`${this.proxyUrl}/api/neo4j/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const error = await response.json();
        throw this.createProxyError(error);
      }

      return await response.json();
    } catch (error: any) {
      throw this.createError(
        ErrorType.QUERY_ERROR,
        'Failed to fetch database schema',
        error
      );
    }
  }

  /**
   * Create a standardized error object
   */
  private createError(type: ErrorType, message: string, details?: any): AppError {
    return {
      type,
      message,
      details: details?.message || details,
    };
  }

  /**
   * Create error from proxy error response
   */
  private createProxyError(error: any): AppError {
    const errorType = this.mapProxyErrorType(error.error?.type);
    return this.createError(
      errorType,
      error.error?.message || 'Unknown proxy error',
      error.error?.details
    );
  }

  /**
   * Map proxy error types to frontend error types
   */
  private mapProxyErrorType(proxyErrorType?: string): ErrorType {
    switch (proxyErrorType) {
      case 'NEO4J_CONNECTION_ERROR':
        return ErrorType.CONNECTION_ERROR;
      case 'NEO4J_QUERY_ERROR':
        return ErrorType.QUERY_ERROR;
      case 'TIMEOUT_ERROR':
        return ErrorType.TIMEOUT_ERROR;
      case 'VALIDATION_ERROR':
        return ErrorType.QUERY_ERROR;
      default:
        return ErrorType.QUERY_ERROR;
    }
  }

  /**
   * Check if the service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get node statistics with counts for each label
   */
  async getNodeStatistics(options?: { limit?: number; offset?: number }): Promise<any[]> {
    const cacheKey = `nodeStats_${options?.limit || 50}_${options?.offset || 0}`;
    const cached = this.statisticsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    if (!this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to backend proxy'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.proxyUrl}/api/neo4j/statistics/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw this.createProxyError(error);
      }

      const result = await response.json();
      const statistics = result.statistics;

      this.statisticsCache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now()
      });

      return statistics;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw this.createError(
          ErrorType.TIMEOUT_ERROR,
          'Query timed out after 30 seconds',
          error
        );
      }
      
      throw this.createError(
        ErrorType.QUERY_ERROR,
        'Failed to fetch node statistics',
        error
      );
    }
  }

  /**
   * Get relationship statistics for a specific node label
   */
  async getRelationshipStatistics(
    nodeLabel: string, 
    options?: { sampleSize?: number }
  ): Promise<any[]> {
    const cacheKey = `relStats_${nodeLabel}`;
    const cached = this.statisticsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    if (!this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to backend proxy'
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${this.proxyUrl}/api/neo4j/statistics/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeLabel, ...options }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw this.createProxyError(error);
      }

      const result = await response.json();
      const statistics = result.statistics;

      this.statisticsCache.set(cacheKey, {
        data: statistics,
        timestamp: Date.now()
      });

      return statistics;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw this.createError(
          ErrorType.TIMEOUT_ERROR,
          `Query timed out after 30 seconds for ${nodeLabel}`,
          error
        );
      }
      
      throw this.createError(
        ErrorType.QUERY_ERROR,
        `Failed to fetch relationship statistics for ${nodeLabel}`,
        error
      );
    }
  }

  /**
   * Check if APOC procedures are available (cached result from backend)
   */
  async checkApocAvailability(): Promise<boolean> {
    // APOC availability is now handled by the backend
    // This method is kept for compatibility but always returns true
    // since the backend will use APOC if available
    return true;
  }

  /**
   * Close the connection (no-op for proxy)
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.statisticsCache.clear();
  }
}

// Export a singleton instance
export const neo4jService = new Neo4jService();
