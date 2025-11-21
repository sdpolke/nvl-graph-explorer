/**
 * Neo4j Service
 * Handles all interactions with the Neo4j database including connection management,
 * query execution, and data transformation
 */

import neo4j from 'neo4j-driver';
import type { GraphData, Node, Relationship, AppError } from '../types';
import { ErrorType } from '../types';
import { config } from '../config/env';

export class Neo4jService {
  private driver: any | null = null;
  private isConnected: boolean = false;
  private currentSession: any | null = null;
  private isQueryRunning: boolean = false;

  /**
   * Initialize the Neo4j driver and establish connection
   */
  async connect(): Promise<void> {
    try {
      // If already connected, don't create a new driver
      if (this.driver && this.isConnected) {
        return;
      }

      // Close existing driver if present but not connected
      if (this.driver) {
        await this.driver.close();
        this.driver = null;
      }

      this.driver = neo4j.driver(
        config.neo4j.uri,
        neo4j.auth.basic(config.neo4j.username, config.neo4j.password),
        {
          maxConnectionPoolSize: config.neo4j.maxConnectionPoolSize,
          connectionTimeout: config.neo4j.connectionTimeout,
        }
      );

      // Verify connectivity
      await this.verifyConnection();
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      console.error('Connection error details:', error);
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Failed to connect to Neo4j database',
        error
      );
    }
  }

  /**
   * Verify the database connection is working
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.driver) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Driver not initialized'
      );
    }

    const session = this.driver.session();
    
    try {
      await session.run('RETURN 1');
      return true;
    } catch (error) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Connection verification failed',
        error
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Check if a query is an aggregation/count query
   */
  private isAggregationQuery(cypher: string): boolean {
    // Check if query uses aggregation functions
    const hasAggregation = /\b(COUNT|SUM|AVG|MIN|MAX|COLLECT)\s*\(/i.test(cypher);
    // Check if RETURN clause doesn't include nodes or relationships
    const returnMatch = cypher.match(/RETURN\s+(.+?)(?:LIMIT|ORDER|$)/i);
    if (returnMatch) {
      const returnClause = returnMatch[1];
      // If return clause has aggregation and no node/relationship variables
      const hasNodeOrRel = /\b[a-z]\b|\b[a-z]-\[|\]-\([a-z]\)/i.test(returnClause);
      return hasAggregation && !hasNodeOrRel;
    }
    return false;
  }

  /**
   * Execute a Cypher query and return graph data
   */
  async executeQuery(
    cypher: string,
    params: Record<string, any> = {}
  ): Promise<GraphData> {
    if (!this.driver || !this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to Neo4j database'
      );
    }

    this.currentSession = this.driver.session();
    this.isQueryRunning = true;
    
    try {
      const result = await this.currentSession.run(cypher, params);
      
      // Check if this is an aggregation query
      if (this.isAggregationQuery(cypher)) {
        // Return the aggregation result as metadata
        const aggregationResults = result.records.map((record: any) => {
          const obj: Record<string, any> = {};
          record.keys.forEach((key: string) => {
            const value = record.get(key);
            obj[key] = neo4j.isInt(value) ? value.toNumber() : value;
          });
          return obj;
        });
        
        console.log('Aggregation query result:', aggregationResults);
        
        // Return empty graph data with aggregation results in a special format
        return {
          nodes: [],
          relationships: [],
          aggregationResults
        } as any; // We'll need to update the GraphData type
      }
      
      return this.transformResultToGraphData(result);
    } catch (error: any) {
      // Check for timeout errors
      if (error.code === 'ServiceUnavailable' || error.message?.includes('timeout')) {
        throw this.createError(
          ErrorType.TIMEOUT_ERROR,
          'Query execution timed out',
          error
        );
      }
      throw this.createError(
        ErrorType.QUERY_ERROR,
        'Failed to execute query',
        error
      );
    } finally {
      this.isQueryRunning = false;
      if (this.currentSession) {
        await this.currentSession.close();
        this.currentSession = null;
      }
    }
  }

  /**
   * Stop the currently running query
   */
  async stopQuery(): Promise<void> {
    if (this.currentSession && this.isQueryRunning) {
      try {
        await this.currentSession.close();
        this.currentSession = null;
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
    const cypher = `
      MATCH (n)-[r]-(connected)
      WHERE elementId(n) = $nodeId
      RETURN n, r, connected
      LIMIT 50
    `;
    
    try {
      console.log('Expanding node with ID:', nodeId);
      const result = await this.executeQuery(cypher, { nodeId });
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
      return await this.executeQuery(cypher, { limit: neo4j.int(limit) });
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
    if (!this.driver || !this.isConnected) {
      throw this.createError(
        ErrorType.CONNECTION_ERROR,
        'Not connected to Neo4j database'
      );
    }

    const session = this.driver.session();
    try {
      // Get all node labels
      const labelsResult = await session.run('CALL db.labels()');
      const nodeLabels = labelsResult.records.map((record: any) => record.get(0));

      // Get all relationship types
      const relsResult = await session.run('CALL db.relationshipTypes()');
      const relationshipTypes = relsResult.records.map((record: any) => record.get(0));

      // Get node properties for each label
      const nodeProperties: Record<string, string[]> = {};
      for (const label of nodeLabels) {
        try {
          const propsResult = await session.run(`
            MATCH (n:\`${label}\`)
            WITH n LIMIT 100
            UNWIND keys(n) AS key
            RETURN DISTINCT key
            ORDER BY key
          `);
          nodeProperties[label] = propsResult.records.map((record: any) => record.get('key'));
        } catch (err) {
          console.warn(`Failed to fetch properties for label ${label}:`, err);
          nodeProperties[label] = [];
        }
      }

      // Get schema visualization
      const schemaResult = await session.run(`
        CALL db.schema.visualization()
      `);

      // Format schema information
      const schema = this.formatSchema(nodeLabels, relationshipTypes, nodeProperties, schemaResult);

      return {
        nodeLabels,
        relationshipTypes,
        schema
      };
    } catch (error: any) {
      throw this.createError(
        ErrorType.QUERY_ERROR,
        'Failed to fetch database schema',
        error
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Format schema information for OpenAI context
   */
  private formatSchema(
    nodeLabels: string[], 
    relationshipTypes: string[], 
    nodeProperties: Record<string, string[]>,
    schemaResult: any
  ): string {
    let schema = '## Actual Database Schema\n\n';
    
    schema += '### Node Labels with Properties:\n';
    nodeLabels.forEach(label => {
      schema += `- **${label}**`;
      const props = nodeProperties[label];
      if (props && props.length > 0) {
        schema += ` (properties: ${props.join(', ')})`;
      }
      schema += '\n';
    });
    
    schema += '\n### Relationship Types:\n';
    relationshipTypes.forEach(type => {
      schema += `- ${type}\n`;
    });

    // Try to extract relationship patterns from schema visualization
    if (schemaResult.records.length > 0) {
      schema += '\n### Relationship Patterns:\n';
      const record = schemaResult.records[0];
      const nodes = record.get('nodes') || [];
      const relationships = record.get('relationships') || [];
      
      relationships.forEach((rel: any) => {
        try {
          const startNode = nodes.find((n: any) => n.identity.equals(rel.start));
          const endNode = nodes.find((n: any) => n.identity.equals(rel.end));
          
          if (startNode && endNode) {
            const startLabel = startNode.labels?.[0] || 'Node';
            const endLabel = endNode.labels?.[0] || 'Node';
            schema += `- (${startLabel})-[${rel.type}]->(${endLabel})\n`;
          }
        } catch (e) {
          // Skip if we can't parse the relationship
        }
      });
    }

    schema += '\n### Query Guidelines:\n';
    schema += '- Use the actual node labels and properties listed above\n';
    schema += '- Use toLower() for case-insensitive text matching\n';
    schema += '- Always include LIMIT clause (default 50, max 100)\n';
    schema += '- Return both nodes and relationships for graph visualization\n';

    return schema;
  }

  /**
   * Transform Neo4j query result to application GraphData model
   */
  private transformResultToGraphData(result: any): GraphData {
    const nodes: Node[] = [];
    const relationships: Relationship[] = [];
    const nodeIds = new Set<string>();
    const relationshipIds = new Set<string>();

    result.records.forEach((record: any) => {
      record.forEach((value: any) => {
        if (this.isNeo4jNode(value)) {
          // Use elementId for Neo4j 5+ compatibility, fallback to identity for older versions
          const nodeId = value.elementId || value.identity.toString();
          if (!nodeIds.has(nodeId)) {
            nodes.push({
              id: nodeId,
              labels: value.labels,
              properties: this.convertProperties(value.properties),
            });
            nodeIds.add(nodeId);
          }
        } else if (this.isNeo4jRelationship(value)) {
          // Use elementId for Neo4j 5+ compatibility, fallback to identity for older versions
          const relId = value.elementId || value.identity.toString();
          const startNodeId = value.startNodeElementId || value.start.toString();
          const endNodeId = value.endNodeElementId || value.end.toString();
          
          if (!relationshipIds.has(relId)) {
            relationships.push({
              id: relId,
              type: value.type,
              startNodeId: startNodeId,
              endNodeId: endNodeId,
              properties: this.convertProperties(value.properties),
            });
            relationshipIds.add(relId);
          }
        }
      });
    });

    return { nodes, relationships };
  }

  /**
   * Type guard to check if value is a Neo4j node
   */
  private isNeo4jNode(value: any): boolean {
    return value && typeof value === 'object' && 'labels' in value && 'identity' in value;
  }

  /**
   * Type guard to check if value is a Neo4j relationship
   */
  private isNeo4jRelationship(value: any): boolean {
    return value && typeof value === 'object' && 'type' in value && 'start' in value && 'end' in value;
  }

  /**
   * Convert Neo4j property values to plain JavaScript objects
   */
  private convertProperties(properties: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
      if (neo4j.isInt(value)) {
        converted[key] = value.toNumber();
      } else if (neo4j.isDate(value) || neo4j.isDateTime(value) || neo4j.isTime(value)) {
        converted[key] = value.toString();
      } else {
        converted[key] = value;
      }
    }
    
    return converted;
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
   * Check if the service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close the driver connection
   */
  async disconnect(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.close();
      } catch (error) {
        console.error('Error during disconnect:', error);
      } finally {
        this.driver = null;
        this.isConnected = false;
      }
    }
  }
}

// Export a singleton instance
export const neo4jService = new Neo4jService();
