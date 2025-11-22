import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Neo4jService } from './Neo4jService';
import { ErrorType } from '../types';

// Mock fetch globally
globalThis.fetch = vi.fn() as any;

describe('Neo4jService', () => {
  let service: Neo4jService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Neo4jService();
  });

  describe('connect', () => {
    it('should establish connection successfully', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });
      
      await service.connect();
      
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/health'));
      expect(service.isServiceConnected()).toBe(true);
    });

    it('should throw CONNECTION_ERROR on connection failure', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(service.connect()).rejects.toMatchObject({
        type: ErrorType.CONNECTION_ERROR,
        message: 'Failed to connect to backend proxy',
      });
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });
      await service.connect();
    });

    it('should execute query and return graph data', async () => {
      const mockResponse = {
        nodes: [
          {
            id: '1',
            labels: ['Gene'],
            properties: { name: 'TP53' }
          }
        ],
        relationships: [
          {
            id: '10',
            type: 'ENCODES',
            startNodeId: '1',
            endNodeId: '2',
            properties: {}
          }
        ]
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.executeQuery('MATCH (n) RETURN n');

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('1');
      expect(result.nodes[0].labels).toEqual(['Gene']);
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('ENCODES');
    });

    it('should throw QUERY_ERROR on query failure', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            type: 'NEO4J_QUERY_ERROR',
            message: 'Invalid query'
          }
        })
      });

      await expect(service.executeQuery('INVALID QUERY')).rejects.toMatchObject({
        type: ErrorType.QUERY_ERROR,
        message: 'Invalid query',
      });
    });

    it('should throw TIMEOUT_ERROR on timeout', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            type: 'TIMEOUT_ERROR',
            message: 'Query execution timed out'
          }
        })
      });

      await expect(service.executeQuery('MATCH (n) RETURN n')).rejects.toMatchObject({
        type: ErrorType.TIMEOUT_ERROR,
        message: 'Query execution timed out',
      });
    });

    it('should throw CONNECTION_ERROR when not connected', async () => {
      const disconnectedService = new Neo4jService();

      await expect(disconnectedService.executeQuery('MATCH (n) RETURN n')).rejects.toMatchObject({
        type: ErrorType.CONNECTION_ERROR,
        message: 'Not connected to backend proxy',
      });
    });
  });

  describe('expandNode', () => {
    beforeEach(async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });
      await service.connect();
    });

    it('should expand node and return connected nodes', async () => {
      const mockResponse = {
        nodes: [
          {
            id: '1',
            labels: ['Gene'],
            properties: { name: 'TP53' }
          },
          {
            id: '2',
            labels: ['Protein'],
            properties: { name: 'P53' }
          }
        ],
        relationships: [
          {
            id: '10',
            type: 'ENCODES',
            startNodeId: '1',
            endNodeId: '2',
            properties: {}
          }
        ]
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.expandNode('1');

      expect(result.nodes).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/neo4j/expand'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ nodeId: '1' })
        })
      );
    });
  });

  describe('getNodesByLabel', () => {
    beforeEach(async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });
      await service.connect();
    });

    it('should fetch nodes by label', async () => {
      const mockResponse = {
        nodes: [
          {
            id: '1',
            labels: ['Gene'],
            properties: { name: 'TP53' }
          }
        ],
        relationships: []
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await service.getNodesByLabel('Gene', 10);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].labels).toContain('Gene');
    });

    it('should sanitize label to prevent injection', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nodes: [], relationships: [] })
      });

      await service.getNodesByLabel('Gene; DROP TABLE', 10);

      // Verify the query sent to proxy has sanitized label
      // Get the last call (after connect call)
      const calls = (globalThis.fetch as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      expect(body.cypher).toContain('GeneDROPTABLE');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from proxy', async () => {
      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      });
      await service.connect();

      await service.disconnect();

      expect(service.isServiceConnected()).toBe(false);
    });
  });
});
