/**
 * Neo4j Proxy Service - Optimized for Neo4j 5.26
 * 
 * Key optimizations for Neo4j 5.26:
 * 1. Uses db.schema.nodeTypeProperties() for efficient property fetching
 * 2. Leverages CALL subqueries for better query performance
 * 3. Uses elementId instead of deprecated identity fields
 * 4. Optimized aggregation queries with UNION ALL
 * 5. Better use of WITH clauses for query optimization
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import { config } from '../config/env';

interface GraphData {
  nodes: Node[];
  relationships: Relationship[];
  aggregationResults?: any[];
}

interface Node {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

interface Relationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

interface SchemaResponse {
  nodeLabels: string[];
  relationshipTypes: string[];
  schema: string;
}

interface NodeStatsResponse {
  statistics: Array<{
    label: string;
    count: number;
  }>;
}

interface RelStatsResponse {
  statistics: Array<{
    type: string;
    direction: 'incoming' | 'outgoing';
    count: number;
    connectedNodeTypes: string[];
    isSampled: boolean;
    sampleSize?: number;
    totalNodes?: number;
  }>;
}

export class Neo4jProxyService {
  private driver: Driver | null = null;
  private isConnected: boolean = false;
  private apocAvailable: boolean | null = null;
  private schemaCache: { schema: SchemaResponse; timestamp: number } | null = null;
  private readonly SCHEMA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private statsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  async connect(): Promise<void> {
    if (this.driver && this.isConnected) {
      return;
    }

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

    await this.verifyConnection();
    this.isConnected = true;
    console.log('Neo4j connected:', config.neo4j.uri);
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.close();
        console.log('Neo4j disconnected');
      } catch (error) {
        console.error('Error during disconnect:', error);
      } finally {
        this.driver = null;
        this.isConnected = false;
        this.apocAvailable = null;
        this.schemaCache = null;
        this.statsCache.clear();
      }
    }
  }

  private async verifyConnection(): Promise<void> {
    if (!this.driver) {
      throw new Error('Driver not initialized');
    }

    const maxRetries = 5;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = this.driver.session();
      try {
        await session.run('RETURN 1');
        console.log(`Neo4j connection verified on attempt ${attempt}`);
        return;
      } catch (error: any) {
        await session.close();

        if (attempt === maxRetries) {
          throw error;
        }

        console.log(`Connection attempt ${attempt} failed, retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async executeQuery(cypher: string, params: Record<string, any> = {}): Promise<GraphData> {
    if (!this.driver || !this.isConnected) {
      throw new Error('Not connected to Neo4j database');
    }

    const session = this.driver.session();
    try {
      const result = await session.run(cypher, params);

      if (this.isAggregationQuery(cypher)) {
        const aggregationResults = result.records.map((record) => {
          const obj: Record<string, any> = {};
          record.keys.forEach((key) => {
            const value = record.get(key);
            obj[String(key)] = this.convertValue(value);
          });
          return obj;
        });

        return {
          nodes: [],
          relationships: [],
          aggregationResults,
        };
      }

      return this.transformResultToGraphData(result);
    } finally {
      await session.close();
    }
  }

  private isAggregationQuery(cypher: string): boolean {
    const hasAggregation = /\b(COUNT|SUM|AVG|MIN|MAX|COLLECT)\s*\(/i.test(cypher);
    const returnMatch = cypher.match(/RETURN\s+(.+?)(?:LIMIT|ORDER|$)/i);
    if (returnMatch) {
      const returnClause = returnMatch[1];
      const hasNodeOrRel = /\b[a-z]\b|\b[a-z]-\[|\]-\([a-z]\)/i.test(returnClause);
      return hasAggregation && !hasNodeOrRel;
    }
    return false;
  }

  async getSchema(): Promise<SchemaResponse> {
    if (!this.driver || !this.isConnected) {
      throw new Error('Not connected to Neo4j database');
    }

    // Check cache first
    if (this.schemaCache && Date.now() - this.schemaCache.timestamp < this.SCHEMA_CACHE_TTL) {
      console.log('✓ Using cached schema');
      return this.schemaCache.schema;
    }

    const session = this.driver.session();
    try {
      console.log('Fetching database schema...');

      // Neo4j 5.26: Use db.labels() for node labels
      const labelsResult = await session.run('CALL db.labels()');
      const nodeLabels = labelsResult.records.map((record) => record.get(0));
      console.log(`✓ Fetched ${nodeLabels.length} node labels`);

      // Neo4j 5.26: Use db.relationshipTypes() for relationship types
      const relsResult = await session.run('CALL db.relationshipTypes()');
      const relationshipTypes = relsResult.records.map((record) => record.get(0));
      console.log(`✓ Fetched ${relationshipTypes.length} relationship types`);

      // Neo4j 5.26: Use db.schema.nodeTypeProperties() for efficient property fetching
      const nodeProperties: Record<string, string[]> = {};
      
      try {
        const nodeTypePropsResult = await session.run(`
          CALL db.schema.nodeTypeProperties()
          YIELD nodeLabels, propertyName
          WHERE size(nodeLabels) = 1
          WITH nodeLabels[0] AS label, collect(DISTINCT propertyName) AS properties
          RETURN label, properties
          ORDER BY label
        `);

        nodeTypePropsResult.records.forEach((record) => {
          const label = record.get('label');
          const properties = record.get('properties');
          nodeProperties[label] = properties.sort();
        });

        console.log(`✓ Fetched properties for ${Object.keys(nodeProperties).length} labels using db.schema.nodeTypeProperties()`);
      } catch (err) {
        console.warn('db.schema.nodeTypeProperties() failed, falling back to sampling:', err);
        
        // Fallback: Sample nodes for properties
        for (const label of nodeLabels) {
          try {
            const propsResult = await session.run(`
              MATCH (n:\`${label}\`)
              WITH n LIMIT 100
              UNWIND keys(n) AS key
              RETURN DISTINCT key
              ORDER BY key
            `);
            nodeProperties[label] = propsResult.records.map((record) => record.get('key'));
          } catch (err) {
            console.warn(`Failed to fetch properties for label ${label}:`, err);
            nodeProperties[label] = [];
          }
        }
      }

      // Fetch actual relationship patterns by sampling the database
      console.log('Fetching relationship patterns...');
      const relationshipPatterns = await this.fetchRelationshipPatterns(session, relationshipTypes);
      console.log(`✓ Fetched ${relationshipPatterns.length} relationship patterns`);

      const schema = this.formatSchema(nodeLabels, relationshipTypes, nodeProperties, relationshipPatterns);

      console.log('✓ Schema formatted successfully');

      const schemaResponse = { nodeLabels, relationshipTypes, schema };
      
      // Cache the schema
      this.schemaCache = {
        schema: schemaResponse,
        timestamp: Date.now()
      };

      return schemaResponse;
    } finally {
      await session.close();
    }
  }

  private async fetchRelationshipPatterns(
    session: Session,
    relationshipTypes: string[]
  ): Promise<Array<{ startLabel: string; relType: string; endLabel: string; count: number }>> {
    const patterns: Array<{ startLabel: string; relType: string; endLabel: string; count: number }> = [];
    
    // Try APOC meta.schema for fast pattern extraction
    const hasApoc = await this.checkApocAvailability();
    
    if (hasApoc) {
      try {
        console.log('Using APOC meta.schema for fast pattern extraction');
        const apocQuery = `
          CALL apoc.meta.schema() YIELD value
          UNWIND keys(value) AS nodeLabel
          WITH nodeLabel, value[nodeLabel] AS nodeData
          WHERE nodeData.relationships IS NOT NULL
          UNWIND keys(nodeData.relationships) AS relKey
          WITH nodeLabel, relKey, nodeData.relationships[relKey] AS relData
          WHERE relData.direction = 'out'
          UNWIND relData.labels AS targetLabel
          WITH nodeLabel, relData.type AS relType, targetLabel, relData.count AS count
          RETURN nodeLabel AS startLabel, relType, targetLabel AS endLabel, count
          ORDER BY count DESC
          LIMIT 100
        `;
        
        const result = await session.run(apocQuery);
        
        result.records.forEach((record) => {
          const startLabel = record.get('startLabel');
          const relType = record.get('relType');
          const endLabel = record.get('endLabel');
          const count = this.convertValue(record.get('count'));
          
          if (startLabel && relType && endLabel) {
            patterns.push({ startLabel, relType, endLabel, count });
          }
        });
        
        if (patterns.length > 0) {
          console.log(`✓ Found ${patterns.length} relationship patterns using APOC`);
          return patterns;
        }
      } catch (err) {
        console.warn('APOC meta.schema failed, falling back to sampling:', err);
      }
    }
    
    // Fallback: Sample only the most important relationship types (limit to 10 for speed)
    console.log('Using sampling approach (limited to 10 relationship types)');
    const limitedTypes = relationshipTypes.slice(0, 10);
    
    for (const relType of limitedTypes) {
      try {
        const sampleQuery = `
          MATCH (start)-[r:\`${relType}\`]->(end)
          WITH labels(start)[0] AS startLabel, labels(end)[0] AS endLabel, count(*) AS count
          RETURN startLabel, endLabel, count
          ORDER BY count DESC
          LIMIT 2
        `;
        
        const result = await session.run(sampleQuery);
        
        result.records.forEach((record) => {
          const startLabel = record.get('startLabel');
          const endLabel = record.get('endLabel');
          const count = this.convertValue(record.get('count'));
          
          if (startLabel && endLabel) {
            patterns.push({ startLabel, relType, endLabel, count });
          }
        });
      } catch (e) {
        // Skip this relationship type if query fails
      }
    }
    
    console.log(`✓ Found ${patterns.length} relationship patterns from sampling`);
    return patterns;
  }

  async getNodeStatistics(options?: { limit?: number; offset?: number }): Promise<NodeStatsResponse> {
    if (!this.driver || !this.isConnected) {
      throw new Error('Not connected to Neo4j database');
    }

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const cacheKey = `nodeStats_${limit}_${offset}`;
    
    // Check cache
    const cached = this.statsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.STATS_CACHE_TTL) {
      console.log('✓ Using cached node statistics');
      return { statistics: cached.data };
    }

    const session = this.driver.session();

    try {
      try {
        const statistics = await this.runOptimizedNodeStatisticsQuery(session, limit, offset);
        
        // Cache the result
        this.statsCache.set(cacheKey, { data: statistics, timestamp: Date.now() });
        
        return { statistics };
      } catch (optimizedError) {
        console.warn(
          'Optimized statistics query failed, falling back to legacy approach:',
          optimizedError instanceof Error ? optimizedError.message : optimizedError
        );
        const statistics = await this.runLegacyNodeStatisticsQuery(session, limit, offset);
        
        // Cache the result
        this.statsCache.set(cacheKey, { data: statistics, timestamp: Date.now() });
        
        return { statistics };
      }
    } finally {
      await session.close();
    }
  }

  private async runOptimizedNodeStatisticsQuery(
    session: Session,
    limit: number,
    offset: number
  ): Promise<Array<{ label: string; count: number }>> {
    const params = {
      limit: neo4j.int(limit),
      offset: neo4j.int(offset),
    };

    // Try APOC first - it's 10-100x faster than per-label iteration
    const hasApoc = await this.checkApocAvailability();
    
    if (hasApoc) {
      try {
        console.log('Using APOC meta.stats() for fast statistics query');
        const result = await session.run(`
          CALL apoc.meta.stats() YIELD labels
          UNWIND keys(labels) AS label
          WITH label, labels[label] AS count
          WHERE count > 0
          RETURN label, count
          ORDER BY count DESC
          SKIP $offset
          LIMIT $limit
        `, params);
        
        if (result.records.length > 0) {
          console.log(`✓ APOC query returned ${result.records.length} labels`);
          return result.records.map((record) => ({
            label: record.get('label'),
            count: this.convertValue(record.get('count')),
          }));
        }
      } catch (error) {
        console.warn('APOC meta.stats() failed, falling back to per-label query:', error);
      }
    } else {
      console.log('APOC not available, using per-label iteration query');
    }
    
    // Fallback: Single-pass aggregation (much faster than per-label iteration)
    console.log('Using single-pass aggregation for statistics');
    const result = await session.run(`
      MATCH (n)
      UNWIND labels(n) AS label
      WITH label, count(*) AS count
      WHERE count > 0
      RETURN label, count
      ORDER BY count DESC
      SKIP $offset
      LIMIT $limit
    `, params);
    
    return result.records.map((record) => ({
      label: record.get('label'),
      count: this.convertValue(record.get('count')),
    }));
  }

  private async runLegacyNodeStatisticsQuery(
    session: Session,
    limit: number,
    offset: number
  ): Promise<Array<{ label: string; count: number }>> {
    const params = {
      limit: neo4j.int(limit),
      offset: neo4j.int(offset),
    };

    // Single-pass aggregation (same as optimized fallback)
    console.log('Using single-pass aggregation (legacy fallback)');
    const result = await session.run(`
      MATCH (n)
      UNWIND labels(n) AS label
      WITH label, count(*) AS count
      WHERE count > 0
      RETURN label, count
      ORDER BY count DESC
      SKIP $offset
      LIMIT $limit
    `, params);
    
    return result.records.map((record) => ({
      label: record.get('label'),
      count: this.convertValue(record.get('count')),
    }));
  }

  async getRelationshipStatistics(
    nodeLabel: string,
    options?: { sampleSize?: number }
  ): Promise<RelStatsResponse> {
    if (!this.driver || !this.isConnected) {
      throw new Error('Not connected to Neo4j database');
    }

    const session = this.driver.session();
    const sampleSize = options?.sampleSize || 10000;

    try {
      // Neo4j 5.26: Use CALL subquery for better performance
      const countResult = await session.run(
        `MATCH (n:\`${nodeLabel}\`) RETURN count(n) AS totalCount`
      );
      const totalNodes = this.convertValue(countResult.records[0]?.get('totalCount')) || 0;

      const shouldSample = totalNodes > 10000;

      // Neo4j 5.26: Optimized query using CALL subqueries and better aggregation
      const optimizedQuery = `
        CALL {
          MATCH (n:\`${nodeLabel}\`)
          ${shouldSample ? `WITH n LIMIT ${sampleSize}` : ''}
          MATCH (n)-[r]->(m)
          WITH type(r) AS relType, labels(m) AS targetLabels, count(*) AS relCount
          UNWIND targetLabels AS targetLabel
          RETURN relType, 'outgoing' AS direction, targetLabel, sum(relCount) AS count
        }
        RETURN relType, direction, targetLabel, count
        ORDER BY count DESC
        LIMIT 100
        
        UNION ALL
        
        CALL {
          MATCH (n:\`${nodeLabel}\`)
          ${shouldSample ? `WITH n LIMIT ${sampleSize}` : ''}
          MATCH (n)<-[r]-(m)
          WITH type(r) AS relType, labels(m) AS sourceLabels, count(*) AS relCount
          UNWIND sourceLabels AS sourceLabel
          RETURN relType, 'incoming' AS direction, sourceLabel, sum(relCount) AS count
        }
        RETURN relType, direction, sourceLabel AS targetLabel, count
        ORDER BY count DESC
        LIMIT 100
      `;

      const result = await session.run(optimizedQuery);

      const grouped = new Map<string, any>();

      result.records.forEach((record) => {
        const relType = record.get('relType');
        const direction = record.get('direction');
        const connectedLabel = record.get('targetLabel');
        const count = this.convertValue(record.get('count'));

        const key = `${relType}_${direction}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            type: relType,
            direction,
            count: 0,
            connectedNodeTypes: [],
            isSampled: shouldSample,
            sampleSize: shouldSample ? sampleSize : undefined,
            totalNodes: shouldSample ? totalNodes : undefined,
          });
        }

        const entry = grouped.get(key);
        entry.count += count;
        if (!entry.connectedNodeTypes.includes(connectedLabel)) {
          entry.connectedNodeTypes.push(connectedLabel);
        }
      });

      const statistics = Array.from(grouped.values());

      return { statistics };
    } finally {
      await session.close();
    }
  }

  async checkHealth(): Promise<{ connected: boolean; responseTime: number }> {
    const startTime = Date.now();

    if (!this.driver) {
      return { connected: false, responseTime: 0 };
    }

    const session = this.driver.session();
    try {
      await session.run('RETURN 1');
      const responseTime = Date.now() - startTime;
      return { connected: true, responseTime };
    } catch (error) {
      console.error('Health check failed:', error);
      return { connected: false, responseTime: Date.now() - startTime };
    } finally {
      await session.close();
    }
  }

  getDriver(): Driver {
    if (!this.driver || !this.isConnected) {
      throw new Error('Not connected to Neo4j database');
    }
    return this.driver;
  }

  private async checkApocAvailability(): Promise<boolean> {
    if (this.apocAvailable !== null) {
      return this.apocAvailable;
    }

    if (!this.driver || !this.isConnected) {
      return false;
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        'CALL dbms.procedures() YIELD name WHERE name STARTS WITH "apoc" RETURN count(name) AS count'
      );
      const count = result.records[0]?.get('count');
      this.apocAvailable = this.convertValue(count) > 0;
      return this.apocAvailable;
    } catch (error) {
      this.apocAvailable = false;
      return false;
    } finally {
      await session.close();
    }
  }

  private formatSchema(
    nodeLabels: string[],
    relationshipTypes: string[],
    nodeProperties: Record<string, string[]>,
    relationshipPatterns: Array<{ startLabel: string; relType: string; endLabel: string; count: number }>
  ): string {
    let schema = '## Actual Database Schema\n\n';

    schema += '### Node Labels with Properties:\n';
    nodeLabels.forEach((label) => {
      schema += `- **${label}**`;
      const props = nodeProperties[label];
      if (props && props.length > 0) {
        schema += ` (properties: ${props.join(', ')})`;
      }
      schema += '\n';
    });

    schema += '\n### Relationship Types:\n';
    relationshipTypes.forEach((type) => {
      schema += `- ${type}\n`;
    });

    // Add actual relationship patterns from the database
    if (relationshipPatterns.length > 0) {
      schema += '\n### Relationship Patterns (from actual data):\n';
      
      // Group patterns by relationship type for better readability
      const patternsByType = new Map<string, Array<{ startLabel: string; endLabel: string; count: number }>>();
      
      relationshipPatterns.forEach(({ startLabel, relType, endLabel, count }) => {
        if (!patternsByType.has(relType)) {
          patternsByType.set(relType, []);
        }
        patternsByType.get(relType)!.push({ startLabel, endLabel, count });
      });
      
      // Sort by total count for each relationship type
      const sortedTypes = Array.from(patternsByType.entries())
        .sort((a, b) => {
          const sumA = a[1].reduce((sum, p) => sum + p.count, 0);
          const sumB = b[1].reduce((sum, p) => sum + p.count, 0);
          return sumB - sumA;
        });
      
      sortedTypes.forEach(([relType, patterns]) => {
        patterns.forEach(({ startLabel, endLabel, count }) => {
          schema += `- (${startLabel})-[:${relType}]->(${endLabel}) [${count.toLocaleString()} relationships]\n`;
        });
      });
    }

    schema += '\n### Query Guidelines:\n';
    schema += '- Use the actual node labels and properties listed above\n';
    schema += '- Use the relationship patterns shown above - these are REAL patterns from the database\n';
    schema += '- Use toLower() for case-insensitive text matching\n';
    schema += '- Always include LIMIT clause (default 50, max 100)\n';
    schema += '- Return both nodes and relationships for graph visualization\n';
    schema += '- For multi-hop queries, chain the patterns shown above\n';

    return schema;
  }

  private transformResultToGraphData(result: any): GraphData {
    const nodes: Node[] = [];
    const relationships: Relationship[] = [];
    const nodeIds = new Set<string>();
    const relationshipIds = new Set<string>();

    result.records.forEach((record: any) => {
      record.keys.forEach((key: string) => {
        const value = record.get(key);
        if (this.isNeo4jNode(value)) {
          // Neo4j 5.26: Prefer elementId over deprecated identity
          const nodeId = value.elementId || value.identity?.toString() || String(value.identity);
          if (!nodeIds.has(nodeId)) {
            nodes.push({
              id: nodeId,
              labels: value.labels,
              properties: this.convertProperties(value.properties),
            });
            nodeIds.add(nodeId);
          }
        } else if (this.isNeo4jRelationship(value)) {
          // Neo4j 5.26: Prefer elementId over deprecated identity
          const relId = value.elementId || value.identity?.toString() || String(value.identity);
          const startNodeId = value.startNodeElementId || value.start?.toString() || String(value.start);
          const endNodeId = value.endNodeElementId || value.end?.toString() || String(value.end);

          if (!relationshipIds.has(relId)) {
            const relationship = {
              id: relId,
              type: value.type,
              startNodeId,
              endNodeId,
              properties: this.convertProperties(value.properties),
            };
            relationships.push(relationship);
            relationshipIds.add(relId);

            // Log relationship details for debugging
            if (relationships.length <= 5) {
              console.log(`Relationship extracted: ${relationship.type} (${relId})`);
            }
          }
        }
      });
    });

    console.log(`Transformed ${nodes.length} nodes and ${relationships.length} relationships`);
    if (relationships.length > 0) {
      const uniqueTypes = [...new Set(relationships.map(r => r.type))];
      console.log(`Unique relationship types in result: ${uniqueTypes.join(', ')}`);
    }

    return { nodes, relationships };
  }

  private isNeo4jNode(value: any): boolean {
    return value && typeof value === 'object' && 'labels' in value && 'identity' in value;
  }

  private isNeo4jRelationship(value: any): boolean {
    return value && typeof value === 'object' && 'type' in value && 'start' in value && 'end' in value;
  }

  private convertProperties(properties: Record<string, any>): Record<string, any> {
    const converted: Record<string, any> = {};

    for (const [key, value] of Object.entries(properties)) {
      converted[key] = this.convertValue(value);
    }

    return converted;
  }

  private convertValue(value: any): any {
    if (neo4j.isInt(value)) {
      return value.toNumber();
    } else if (neo4j.isDate(value) || neo4j.isDateTime(value) || neo4j.isTime(value)) {
      return value.toString();
    }
    return value;
  }
}

export const neo4jProxyService = new Neo4jProxyService();
