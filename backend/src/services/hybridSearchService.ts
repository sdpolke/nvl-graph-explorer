/**
 * Hybrid Search Service
 * Combines vector similarity search with graph traversal for comprehensive results
 */

import { Driver } from 'neo4j-driver';
import { EmbeddingService } from './embeddingService';

export type EntityType = 'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein';
export type QueryType = 'semantic' | 'structural' | 'exact' | 'hybrid';

export interface SearchOptions {
  mode?: QueryType;
  entityTypes?: EntityType[];
  limit?: number;
  maxHops?: number;
}

export interface SearchResult {
  entities: RankedEntity[];
  graphData: GraphData;
  queryType: QueryType;
}

export interface RankedEntity {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, any>;
  relevanceScore: number;
  matchReason: string;
}

export interface VectorResult {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, any>;
  score: number;
}

export interface GraphData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export class HybridSearchService {
  private driver: Driver;
  private embeddingService: EmbeddingService;

  constructor(driver: Driver, embeddingService: EmbeddingService) {
    this.driver = driver;
    this.embeddingService = embeddingService;
  }

  /**
   * Perform hybrid search combining vector and graph
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const queryType = this.routeQuery(query, options.mode);
    const limit = options.limit || 10;
    const maxHops = options.maxHops || 2;

    // Generate embedding for query
    const embedding = await this.embeddingService.embed(query);

    // Perform vector search
    const vectorResults = await this.vectorSearch(
      embedding,
      options.entityTypes,
      limit
    );

    // Expand graph from top results
    const entityIds = vectorResults.map(r => r.id);
    const graphData = await this.expandGraph(entityIds, maxHops);

    // Rank combined results
    const rankedEntities = await this.rankResults(vectorResults, graphData);

    return {
      entities: rankedEntities,
      graphData,
      queryType
    };
  }

  /**
   * Route query based on keywords
   */
  private routeQuery(query: string, mode?: QueryType): QueryType {
    if (mode) return mode;

    const lowerQuery = query.toLowerCase();

    // Semantic indicators
    if (lowerQuery.includes('similar') || lowerQuery.includes('like')) {
      return 'semantic';
    }

    // Structural indicators
    if (lowerQuery.includes('pathway') || lowerQuery.includes('mechanism')) {
      return 'structural';
    }

    // Exact match indicators
    if (lowerQuery.includes('list all') || lowerQuery.includes('show all')) {
      return 'exact';
    }

    // Default to hybrid
    return 'hybrid';
  }

  /**
   * Vector-only search using Neo4j vector indexes
   */
  async vectorSearch(
    embedding: number[],
    entityTypes?: EntityType[],
    limit: number = 10
  ): Promise<VectorResult[]> {
    const session = this.driver.session();
    const results: VectorResult[] = [];

    try {
      const types = entityTypes || ['Drug', 'Disease', 'ClinicalDisease', 'Protein'];

      for (const type of types) {
        const indexName = this.getIndexName(type);
        
        const query = `
          CALL db.index.vector.queryNodes($indexName, $limit, $embedding)
          YIELD node, score
          RETURN elementId(node) AS id, 
                 labels(node) AS labels,
                 node.name AS name,
                 properties(node) AS properties,
                 score
          ORDER BY score DESC
        `;

        const result = await session.run(query, {
          indexName,
          limit,
          embedding
        });

        result.records.forEach(record => {
          results.push({
            id: record.get('id'),
            type: type,
            name: record.get('name'),
            properties: record.get('properties'),
            score: record.get('score')
          });
        });
      }

      // Sort all results by score and take top N
      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    } finally {
      await session.close();
    }
  }

  /**
   * Get vector index name for entity type
   */
  private getIndexName(type: EntityType): string {
    const indexMap: Record<EntityType, string> = {
      'Drug': 'drug_embeddings',
      'Disease': 'disease_embeddings',
      'ClinicalDisease': 'clinical_disease_embeddings',
      'Protein': 'protein_embeddings'
    };
    return indexMap[type];
  }

  /**
   * Expand graph from seed entities
   */
  async expandGraph(entityIds: string[], maxHops: number = 2): Promise<GraphData> {
    if (entityIds.length === 0) {
      return { nodes: [], relationships: [] };
    }

    const session = this.driver.session();

    try {
      const query = `
        MATCH (start)
        WHERE elementId(start) IN $entityIds
        CALL {
          WITH start
          MATCH path = (start)-[*1..${maxHops}]-(connected)
          RETURN path
          LIMIT 50
        }
        WITH collect(path) AS paths
        UNWIND paths AS path
        UNWIND nodes(path) AS node
        WITH collect(DISTINCT node) AS allNodes, paths
        UNWIND paths AS path
        UNWIND relationships(path) AS rel
        WITH allNodes, collect(DISTINCT rel) AS allRels
        RETURN allNodes AS nodes, allRels AS relationships
      `;

      const result = await session.run(query, { entityIds });

      if (result.records.length === 0) {
        return { nodes: [], relationships: [] };
      }

      const record = result.records[0];
      const nodes = this.transformNodes(record.get('nodes') || []);
      const relationships = this.transformRelationships(record.get('relationships') || []);

      return { nodes, relationships };
    } finally {
      await session.close();
    }
  }

  /**
   * Transform Neo4j nodes to GraphNode format
   */
  private transformNodes(neo4jNodes: any[]): GraphNode[] {
    return neo4jNodes.map(node => ({
      id: node.elementId || node.identity?.toString(),
      labels: node.labels || [],
      properties: node.properties || {}
    }));
  }

  /**
   * Transform Neo4j relationships to GraphRelationship format
   */
  private transformRelationships(neo4jRels: any[]): GraphRelationship[] {
    return neo4jRels.map(rel => ({
      id: rel.elementId || rel.identity?.toString(),
      type: rel.type,
      startNodeId: rel.startNodeElementId || rel.start?.toString(),
      endNodeId: rel.endNodeElementId || rel.end?.toString(),
      properties: rel.properties || {}
    }));
  }

  /**
   * Rank and merge results from vector and graph
   */
  async rankResults(
    vectorResults: VectorResult[],
    graphData: GraphData
  ): Promise<RankedEntity[]> {
    const rankedMap = new Map<string, RankedEntity>();

    // Add vector results with their scores
    vectorResults.forEach(result => {
      rankedMap.set(result.id, {
        id: result.id,
        type: result.type,
        name: result.name,
        properties: result.properties,
        relevanceScore: result.score,
        matchReason: 'semantic_match'
      });
    });

    // Calculate graph centrality for connected nodes
    const centralityScores = this.calculateCentrality(graphData);

    // Boost scores for nodes with high centrality
    graphData.nodes.forEach(node => {
      const centrality = centralityScores.get(node.id) || 0;
      
      if (rankedMap.has(node.id)) {
        // Boost existing score
        const existing = rankedMap.get(node.id)!;
        existing.relevanceScore = existing.relevanceScore * 0.7 + centrality * 0.3;
        existing.matchReason = 'semantic_and_structural';
      } else if (centrality > 0.1) {
        // Add high-centrality nodes
        rankedMap.set(node.id, {
          id: node.id,
          type: this.inferEntityType(node.labels),
          name: node.properties.name || 'Unknown',
          properties: node.properties,
          relevanceScore: centrality * 0.5,
          matchReason: 'structural_relevance'
        });
      }
    });

    // Convert to array and sort by score
    const ranked = Array.from(rankedMap.values());
    ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return ranked;
  }

  /**
   * Calculate centrality scores for nodes in graph
   */
  private calculateCentrality(graphData: GraphData): Map<string, number> {
    const scores = new Map<string, number>();
    const connections = new Map<string, number>();

    // Count connections for each node
    graphData.relationships.forEach(rel => {
      connections.set(rel.startNodeId, (connections.get(rel.startNodeId) || 0) + 1);
      connections.set(rel.endNodeId, (connections.get(rel.endNodeId) || 0) + 1);
    });

    // Normalize scores
    const maxConnections = Math.max(...Array.from(connections.values()), 1);
    connections.forEach((count, nodeId) => {
      scores.set(nodeId, count / maxConnections);
    });

    return scores;
  }

  /**
   * Infer entity type from node labels
   */
  private inferEntityType(labels: string[]): EntityType {
    if (labels.includes('Drug')) return 'Drug';
    if (labels.includes('Disease')) return 'Disease';
    if (labels.includes('ClinicalDisease')) return 'ClinicalDisease';
    if (labels.includes('Protein')) return 'Protein';
    return 'Drug'; // Default fallback
  }
}
