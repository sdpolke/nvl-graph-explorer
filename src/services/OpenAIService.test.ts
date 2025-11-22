import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIService } from './OpenAIService';
import { ErrorType } from '../types';

globalThis.fetch = vi.fn() as any;

describe('OpenAIService', () => {
  let service: OpenAIService;
  const mockProxyUrl = 'http://localhost:3001';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenAIService(mockProxyUrl);
  });

  describe('generateCypherQuery', () => {
    it('should generate Cypher query from natural language via proxy', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          cypherQuery: 'MATCH (g:Gene)-[r:ASSOCIATED_WITH]->(d:Disease) WHERE toLower(d.name) CONTAINS "cancer" RETURN g, r, d LIMIT 50',
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await service.generateCypherQuery('Show me genes related to cancer');

      expect(result).toContain('MATCH');
      expect(result).toContain('RETURN');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockProxyUrl}/api/openai/generate`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            query: 'Show me genes related to cancer',
            schema: undefined,
          }),
        })
      );
    });

    it('should pass dynamic schema to proxy', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          cypherQuery: 'MATCH (n:Gene) RETURN n LIMIT 10',
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      const dynamicSchema = 'Custom schema info';
      await service.generateCypherQuery('Show me genes', dynamicSchema);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${mockProxyUrl}/api/openai/generate`,
        expect.objectContaining({
          body: JSON.stringify({
            query: 'Show me genes',
            schema: dynamicSchema,
          }),
        })
      );
    });

    it('should throw error when query is empty', async () => {
      await expect(service.generateCypherQuery('')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: 'Query cannot be empty',
      });
    });

    it('should handle proxy error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        json: async () => ({
          error: {
            type: 'OPENAI_NOT_CONFIGURED',
            message: 'OpenAI API key is not configured',
          },
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('OpenAI API key is not configured'),
      });
    });

    it('should handle proxy validation errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid request',
          },
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('Invalid request'),
      });
    });

    it('should handle network errors', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('Network error'),
      });
    });

    it('should handle empty response from proxy', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({}),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('No Cypher query returned'),
      });
    });

    it('should handle malformed proxy error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); },
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: 'Unknown error',
      });
    });
  });
});
