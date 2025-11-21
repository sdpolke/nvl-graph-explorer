import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Neo4jService } from './Neo4jService';
import neo4j from 'neo4j-driver';
import { ErrorType } from '../types';

// Mock neo4j-driver
vi.mock('neo4j-driver', () => {
  const mockSession = {
    run: vi.fn(),
    close: vi.fn(),
  };

  const mockDriver = {
    session: vi.fn(() => mockSession),
    close: vi.fn(),
  };

  return {
    default: {
      driver: vi.fn(() => mockDriver),
      auth: {
        basic: vi.fn((username, password) => ({ username, password })),
      },
      int: vi.fn((value) => value),
      isInt: vi.fn(() => false),
      isDate: vi.fn(() => false),
      isDateTime: vi.fn(() => false),
      isTime: vi.fn(() => false),
    },
  };
});

describe('Neo4jService', () => {
  let service: Neo4jService;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new Neo4jService();
    mockDriver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
    mockSession = mockDriver.session();
  });

  describe('connect', () => {
    it('should establish connection successfully', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });
      
      await service.connect();
      
      expect(neo4j.driver).toHaveBeenCalled();
      expect(service.isServiceConnected()).toBe(true);
    });

    it('should throw CONNECTION_ERROR on connection failure', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Connection failed'));
      
      await expect(service.connect()).rejects.toMatchObject({
        type: ErrorType.CONNECTION_ERROR,
        message: 'Failed to connect to Neo4j database',
      });
    });
  });

  describe('executeQuery', () => {
    beforeEach(async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });
      await service.connect();
    });

    it('should execute query and return graph data', async () => {
      const mockNode = {
        identity: '1',
        labels: ['Gene'],
        properties: { name: 'TP53' },
      };

      const mockRelationship = {
        identity: '10',
        type: 'ENCODES',
        start: '1',
        end: '2',
        properties: {},
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            forEach: (callback: Function) => {
              callback(mockNode);
              callback(mockRelationship);
            },
          },
        ],
      });

      const result = await service.executeQuery('MATCH (n) RETURN n');

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].id).toBe('1');
      expect(result.nodes[0].labels).toEqual(['Gene']);
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].type).toBe('ENCODES');
    });

    it('should throw QUERY_ERROR on query failure', async () => {
      mockSession.run.mockRejectedValueOnce(new Error('Invalid query'));

      await expect(service.executeQuery('INVALID QUERY')).rejects.toMatchObject({
        type: ErrorType.QUERY_ERROR,
        message: 'Failed to execute query',
      });
    });

    it('should throw TIMEOUT_ERROR on timeout', async () => {
      mockSession.run.mockRejectedValueOnce({
        code: 'ServiceUnavailable',
        message: 'timeout',
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
        message: 'Not connected to Neo4j database',
      });
    });
  });

  describe('expandNode', () => {
    beforeEach(async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });
      await service.connect();
    });

    it('should expand node and return connected nodes', async () => {
      const mockNode1 = {
        identity: '1',
        labels: ['Gene'],
        properties: { name: 'TP53' },
      };

      const mockNode2 = {
        identity: '2',
        labels: ['Protein'],
        properties: { name: 'P53' },
      };

      const mockRelationship = {
        identity: '10',
        type: 'ENCODES',
        start: '1',
        end: '2',
        properties: {},
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            forEach: (callback: Function) => {
              callback(mockNode1);
              callback(mockRelationship);
              callback(mockNode2);
            },
          },
        ],
      });

      const result = await service.expandNode('1');

      expect(result.nodes).toHaveLength(2);
      expect(result.relationships).toHaveLength(1);
      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH (n)-[r]-(connected)'),
        expect.objectContaining({ nodeId: '1' })
      );
    });
  });

  describe('getNodesByLabel', () => {
    beforeEach(async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });
      await service.connect();
    });

    it('should fetch nodes by label', async () => {
      const mockNode = {
        identity: '1',
        labels: ['Gene'],
        properties: { name: 'TP53' },
      };

      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            forEach: (callback: Function) => {
              callback(mockNode);
            },
          },
        ],
      });

      const result = await service.getNodesByLabel('Gene', 10);

      expect(result.nodes).toHaveLength(1);
      expect(result.nodes[0].labels).toContain('Gene');
    });

    it('should sanitize label to prevent injection', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      await service.getNodesByLabel('Gene; DROP TABLE', 10);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('GeneDROPTABLE'),
        expect.any(Object)
      );
    });
  });

  describe('disconnect', () => {
    it('should close driver connection', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });
      await service.connect();

      await service.disconnect();

      expect(mockDriver.close).toHaveBeenCalled();
      expect(service.isServiceConnected()).toBe(false);
    });
  });
});
