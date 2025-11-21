import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIService } from './OpenAIService';
import { ErrorType } from '../types';

// Mock fetch globally
globalThis.fetch = vi.fn() as any;

describe('OpenAIService', () => {
  let service: OpenAIService;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OpenAIService(mockApiKey);
  });

  describe('generateCypherQuery', () => {
    it('should generate Cypher query from natural language', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'MATCH (g:Gene)-[r:ASSOCIATED_WITH]->(d:Disease) WHERE toLower(d.name) CONTAINS "cancer" RETURN g, r, d LIMIT 50',
              },
            },
          ],
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await service.generateCypherQuery('Show me genes related to cancer');

      expect(result).toContain('MATCH');
      expect(result).toContain('RETURN');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': `Bearer ${mockApiKey}`,
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should extract Cypher from markdown code blocks', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```cypher\nMATCH (n:Gene) RETURN n LIMIT 10\n```',
              },
            },
          ],
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      const result = await service.generateCypherQuery('Show me genes');

      expect(result).toContain('MATCH');
      expect(result).toContain('RETURN');
      expect(result).not.toContain('```');
    });

    it('should throw error when API key is missing', async () => {
      const serviceWithoutKey = new OpenAIService('');

      await expect(serviceWithoutKey.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
      });
    });

    it('should throw error when query is empty', async () => {
      await expect(service.generateCypherQuery('')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: 'Query cannot be empty',
      });
    });

    it('should handle 401 unauthorized error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key' },
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('Invalid OpenAI API key'),
      });
    });

    it('should handle 429 rate limit error', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        json: async () => ({}),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('rate limit exceeded'),
      });
    });

    it('should handle network errors', async () => {
      (globalThis.fetch as any).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('Network error'),
      });
    });

    it('should handle empty response from API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [],
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('No response generated'),
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'This is not a valid Cypher query',
              },
            },
          ],
        }),
      };

      (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

      await expect(service.generateCypherQuery('test query')).rejects.toMatchObject({
        type: ErrorType.GPT_ERROR,
        message: expect.stringContaining('Failed to extract valid Cypher query'),
      });
    });
  });

  describe('validateCypherQuery', () => {
    it('should validate correct Cypher query', () => {
      const validQuery = 'MATCH (n:Gene) RETURN n LIMIT 10';
      expect(service.validateCypherQuery(validQuery)).toBe(true);
    });

    it('should reject query without MATCH', () => {
      const invalidQuery = 'RETURN n LIMIT 10';
      expect(service.validateCypherQuery(invalidQuery)).toBe(false);
    });

    it('should reject query without RETURN', () => {
      const invalidQuery = 'MATCH (n:Gene) LIMIT 10';
      expect(service.validateCypherQuery(invalidQuery)).toBe(false);
    });
  });
});
