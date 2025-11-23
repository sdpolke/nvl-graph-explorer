/**
 * Property-based tests for chat API
 * Feature: semantic-search-chat, Property 48: No multi-step reasoning
 * Validates: Requirements 11.3
 */

import fc from 'fast-check';
import { ResponseGenerator } from '../services/responseGenerator';
import { SearchResult } from '../services/hybridSearchService';

describe('Property Tests: Chat Error Handling', () => {
  let responseGenerator: ResponseGenerator;
  let apiCallCount: number;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    responseGenerator = new ResponseGenerator();
    apiCallCount = 0;

    // Mock fetch to count API calls
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
      apiCallCount++;
      
      // Simulate OpenAI response
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: 'Test response'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      } as Response;
    }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Property 48: No multi-step reasoning
   * For any query that returns no results, the system should respond immediately 
   * without additional API calls
   */
  test('Property 48: No multi-step reasoning - no results case', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (query) => {
          // Reset API call counter
          apiCallCount = 0;

          // Create empty search result (no results found)
          const emptySearchResult: SearchResult = {
            entities: [],
            graphData: {
              nodes: [],
              relationships: []
            },
            queryType: 'semantic'
          };

          // Generate response with no results
          const response = await responseGenerator.generate(
            query,
            emptySearchResult
          );

          // Verify response is returned
          expect(response).toBeDefined();
          expect(response.answer).toBeDefined();
          expect(response.sources).toEqual([]);
          expect(response.confidence).toBe(0);

          // Critical assertion: No API calls should be made when there are no results
          expect(apiCallCount).toBe(0);

          // Verify the response contains helpful guidance
          expect(response.answer).toContain('couldn\'t find');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 48 extension: Single LLM call with results
   * For any query with results, exactly one LLM call should be made
   */
  test('Property 48: No multi-step reasoning - single LLM call with results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('Drug', 'Disease', 'Protein', 'ClinicalDisease'),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            properties: fc.record({
              indication: fc.option(fc.string()),
              description: fc.option(fc.string())
            }),
            relevanceScore: fc.float({ min: 0, max: 1 }),
            matchReason: fc.constantFrom('semantic_match', 'structural_relevance')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (query, entities) => {
          // Reset API call counter
          apiCallCount = 0;

          // Create search result with entities
          const searchResult: SearchResult = {
            entities: entities as any,
            graphData: {
              nodes: [],
              relationships: []
            },
            queryType: 'semantic'
          };

          // Generate response
          const response = await responseGenerator.generate(
            query,
            searchResult
          );

          // Verify response is returned
          expect(response).toBeDefined();
          expect(response.answer).toBeDefined();
          expect(response.sources.length).toBeGreaterThan(0);

          // Critical assertion: Exactly one API call should be made
          expect(apiCallCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 48 extension: Deterministic pipeline
   * For any query, the system should follow the same three-step pipeline
   */
  test('Property 48: Deterministic pipeline execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.boolean(), // has results or not
        async (query, hasResults) => {
          // Reset API call counter
          apiCallCount = 0;

          const searchResult: SearchResult = hasResults
            ? {
                entities: [{
                  id: 'test-id',
                  type: 'Drug',
                  name: 'Test Drug',
                  properties: { indication: 'Test' },
                  relevanceScore: 0.9,
                  matchReason: 'semantic_match'
                }],
                graphData: { nodes: [], relationships: [] },
                queryType: 'semantic'
              }
            : {
                entities: [],
                graphData: { nodes: [], relationships: [] },
                queryType: 'semantic'
              };

          // Generate response
          const response = await responseGenerator.generate(
            query,
            searchResult
          );

          // Verify response structure is consistent
          expect(response).toHaveProperty('answer');
          expect(response).toHaveProperty('sources');
          expect(response).toHaveProperty('confidence');

          // Verify API call count is deterministic
          if (hasResults) {
            expect(apiCallCount).toBe(1); // Exactly one call with results
          } else {
            expect(apiCallCount).toBe(0); // No calls without results
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
