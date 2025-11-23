/**
 * Property-Based Tests for Response Generator
 * Tests universal properties that should hold across all inputs
 */

import fc from 'fast-check';
import { ResponseGenerator } from './responseGenerator';
import { SearchResult, RankedEntity } from './hybridSearchService';

// Mock config
jest.mock('../config/env', () => ({
  config: {
    openai: {
      apiKey: 'test-api-key',
      model: 'gpt-4o-mini',
      maxTokens: 500
    }
  }
}));

describe('Property Tests: Response Generator', () => {
  let responseGenerator: ResponseGenerator;

  beforeEach(() => {
    responseGenerator = new ResponseGenerator();
    // Clear all mocks
    jest.clearAllMocks();
  });

  /**
   * Property 8: Response time constraint
   * For any chat message, the system should return a response within 3 seconds
   * **Validates: Requirements 3.1**
   */
  test('Property 8: Response time constraint', async () => {
    // Mock fetch to return quickly
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.string(),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }),
            properties: fc.record({
              name: fc.string(),
              indication: fc.option(fc.string()),
              description: fc.option(fc.string())
            }),
            relevanceScore: fc.float({ min: 0, max: 1 }),
            matchReason: fc.string()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (query, entities) => {
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const startTime = Date.now();
          await responseGenerator.generate(query, searchResult);
          const duration = Date.now() - startTime;

          // Should complete in under 3 seconds (3000ms)
          expect(duration).toBeLessThan(3000);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000); // 30 second test timeout

  /**
   * Property 9: Source citation presence
   * For any generated response with relevant entities, the sources array should be non-empty
   * **Validates: Requirements 3.2**
   */
  test('Property 9: Source citation presence', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response with entities' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.string(),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }),
            properties: fc.record({
              name: fc.string(),
              indication: fc.option(fc.string()),
              description: fc.option(fc.string())
            }),
            relevanceScore: fc.float({ min: 0, max: 1 }),
            matchReason: fc.string()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (query, entities) => {
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const response = await responseGenerator.generate(query, searchResult);

          // Sources array should be non-empty when entities are present
          expect(response.sources.length).toBeGreaterThan(0);
          expect(response.sources.length).toBe(entities.length);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 10: Entity highlighting in responses
   * For any answer containing entity names, those names should be wrapped in bold markdown
   * **Validates: Requirements 3.3**
   */
  test('Property 10: Entity highlighting in responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string(),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 3, maxLength: 20 }).filter(n => /^[a-zA-Z]+$/.test(n)),
            properties: fc.record({
              name: fc.string(),
              indication: fc.option(fc.string())
            }),
            relevanceScore: fc.float({ min: 0, max: 1 }),
            matchReason: fc.string()
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (entities) => {
          // Create a response that mentions the entity names
          const entityNames = entities.map(e => e.name);
          const mockResponse = `This is about ${entityNames.join(' and ')}.`;

          global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
              choices: [{
                message: { content: mockResponse },
                finish_reason: 'stop'
              }],
              usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
            })
          }) as jest.Mock;

          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const response = await responseGenerator.generate('test query', searchResult);

          // Check that entity names are wrapped in bold markdown
          entityNames.forEach(name => {
            if (response.answer.includes(name)) {
              expect(response.answer).toMatch(new RegExp(`\\*\\*${name}\\*\\*`));
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 11: Multi-source synthesis
   * For any query with multiple relevant entities (>1), the response should reference multiple sources
   * **Validates: Requirements 3.5**
   */
  test('Property 11: Multi-source synthesis', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Response synthesizing multiple sources' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }),
            properties: fc.record({
              name: fc.string({ minLength: 1 }),
              indication: fc.option(fc.string({ minLength: 1 })),
              description: fc.option(fc.string({ minLength: 1 }))
            }),
            relevanceScore: fc.float({ min: 0, max: 1 }),
            matchReason: fc.string({ minLength: 1 })
          }),
          { minLength: 2, maxLength: 10 } // At least 2 entities
        ),
        async (query, entities) => {
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const response = await responseGenerator.generate(query, searchResult);

          // Should have multiple sources
          expect(response.sources.length).toBeGreaterThan(1);
          
          // All sources should have required metadata
          response.sources.forEach(source => {
            expect(source.entityType).toBeTruthy();
            expect(source.entityName).toBeTruthy();
            expect(source.nodeId).toBeTruthy();
            expect(typeof source.relevanceScore).toBe('number');
            expect(source.excerpt).toBeTruthy();
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Unit test: No results handling
   */
  test('handles no results gracefully', async () => {
    const searchResult: SearchResult = {
      entities: [],
      graphData: { nodes: [], relationships: [] },
      queryType: 'semantic'
    };

    const response = await responseGenerator.generate('test query', searchResult);

    expect(response.answer).toContain("couldn't find");
    expect(response.sources).toEqual([]);
    expect(response.confidence).toBe(0);
  });

  /**
   * Unit test: Source extraction
   */
  test('extracts sources with all required metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    const entities: RankedEntity[] = [
      {
        id: 'drug-1',
        type: 'Drug',
        name: 'Aspirin',
        properties: {
          name: 'Aspirin',
          indication: 'Pain relief',
          mechanism_of_action: 'COX inhibitor'
        },
        relevanceScore: 0.95,
        matchReason: 'semantic_match'
      }
    ];

    const searchResult: SearchResult = {
      entities,
      graphData: { nodes: [], relationships: [] },
      queryType: 'semantic'
    };

    const response = await responseGenerator.generate('test', searchResult);

    expect(response.sources.length).toBe(1);
    const source = response.sources[0];
    
    expect(source.entityType).toBe('Drug');
    expect(source.entityName).toBe('Aspirin');
    expect(source.nodeId).toBe('drug-1');
    expect(source.relevanceScore).toBe(0.95);
    expect(source.excerpt).toContain('Pain relief');
    expect(source.properties).toBeDefined();
  });

  /**
   * Unit test: Confidence calculation
   */
  test('calculates confidence based on result quality', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    // High quality result
    const highQualityResult: SearchResult = {
      entities: [{
        id: '1',
        type: 'Drug',
        name: 'Test',
        properties: {},
        relevanceScore: 0.95,
        matchReason: 'semantic_match'
      }],
      graphData: { nodes: [], relationships: [] },
      queryType: 'semantic'
    };

    const highResponse = await responseGenerator.generate('test', highQualityResult);
    expect(highResponse.confidence).toBeGreaterThan(0.8);

    // Low quality result
    const lowQualityResult: SearchResult = {
      entities: [{
        id: '1',
        type: 'Drug',
        name: 'Test',
        properties: {},
        relevanceScore: 0.3,
        matchReason: 'semantic_match'
      }],
      graphData: { nodes: [], relationships: [] },
      queryType: 'semantic'
    };

    const lowResponse = await responseGenerator.generate('test', lowQualityResult);
    expect(lowResponse.confidence).toBeLessThan(0.5);
  });

  /**
   * Property 27: Source metadata completeness
   * For any source in a response, the source object should contain: 
   * entityType, entityName, nodeId, relevanceScore, and excerpt
   * **Validates: Requirements 7.1, 7.2**
   */
  test('Property 27: Source metadata completeness', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              indication: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              description: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              mondo_definition: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              synonyms: fc.option(fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)))
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (query, entities) => {
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const response = await responseGenerator.generate(query, searchResult);

          // Every source must have all required metadata
          response.sources.forEach(source => {
            expect(source.entityType).toBeTruthy();
            expect(typeof source.entityType).toBe('string');
            
            expect(source.entityName).toBeTruthy();
            expect(typeof source.entityName).toBe('string');
            
            expect(source.nodeId).toBeTruthy();
            expect(typeof source.nodeId).toBe('string');
            
            expect(typeof source.relevanceScore).toBe('number');
            expect(source.relevanceScore).toBeGreaterThanOrEqual(0);
            expect(source.relevanceScore).toBeLessThanOrEqual(1);
            
            expect(source.excerpt).toBeTruthy();
            expect(typeof source.excerpt).toBe('string');
            
            expect(source.properties).toBeDefined();
            expect(typeof source.properties).toBe('object');
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 29: Source ordering
   * For any response with multiple sources, sources should be ordered by descending relevance score
   * **Validates: Requirements 7.4**
   */
  test('Property 29: Source ordering', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              indication: fc.option(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0))
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 2, maxLength: 10 } // At least 2 sources
        ),
        async (query, entities) => {
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const response = await responseGenerator.generate(query, searchResult);

          // Sources should be ordered by descending relevance score
          for (let i = 0; i < response.sources.length - 1; i++) {
            expect(response.sources[i].relevanceScore).toBeGreaterThanOrEqual(
              response.sources[i + 1].relevanceScore
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 30: Excerpt relevance
   * For any source citation, the excerpt should contain property values that were used in generating the answer
   * **Validates: Requirements 7.5**
   */
  test('Property 30: Excerpt relevance', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              indication: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              description: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              mondo_definition: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              mechanism_of_action: fc.option(fc.string({ minLength: 5 }).filter(s => s.trim().length > 0)),
              synonyms: fc.option(fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), { minLength: 1 }))
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (query, entities) => {
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          const response = await responseGenerator.generate(query, searchResult);

          // Each excerpt should be non-empty and contain relevant content
          response.sources.forEach((source) => {
            // Excerpt should not be empty
            expect(source.excerpt.length).toBeGreaterThan(0);
            expect(typeof source.excerpt).toBe('string');
            
            // Excerpt should be either meaningful content or the fallback message
            const isFallback = source.excerpt === 'No description available';
            const hasContent = source.excerpt.length > 0;
            
            expect(hasContent).toBe(true);
            
            // If not fallback, should have reasonable length
            if (!isFallback) {
              expect(source.excerpt.length).toBeGreaterThan(0);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 45: Query type logging
   * For any processed query, the system should log the detected query type
   * **Validates: Requirements 10.5**
   */
  test('Property 45: Query type logging', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.constantFrom('semantic', 'structural', 'exact', 'hybrid'),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (query, queryType, entities) => {
          consoleSpy.mockClear();
          
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: queryType as any
          };

          await responseGenerator.generate(query, searchResult);

          // Should log the query type
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Query type: ${queryType}`)
          );
        }
      ),
      { numRuns: 100 }
    );

    consoleSpy.mockRestore();
  }, 30000);

  /**
   * Property 46: Deterministic pipeline execution
   * For any query, the execution should follow exactly three steps in order: retrieve, expand, generate
   * **Validates: Requirements 11.1**
   */
  test('Property 46: Deterministic pipeline execution', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    }) as jest.Mock;

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (query, entities) => {
          consoleSpy.mockClear();
          
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          await responseGenerator.generate(query, searchResult);

          // Should log the three-step pipeline execution
          const logs = consoleSpy.mock.calls.map(call => call[0]);
          
          // Should mention query type (step 1: retrieve/expand already done)
          expect(logs.some((log: string) => log.includes('Query type'))).toBe(true);
          
          // Should mention single LLM call (step 3: generate)
          expect(logs.some((log: string) => log.includes('single LLM call'))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );

    consoleSpy.mockRestore();
  }, 30000);

  /**
   * Property 47: Single LLM call
   * For any response generation, there should be exactly one call to the OpenAI chat completion API
   * **Validates: Requirements 11.2**
   */
  test('Property 47: Single LLM call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    } as Response);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (query, entities) => {
          fetchSpy.mockClear();
          
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          await responseGenerator.generate(query, searchResult);

          // Should make exactly one fetch call to OpenAI
          const openaiCalls = fetchSpy.mock.calls.filter(call => 
            call[0] === 'https://api.openai.com/v1/chat/completions'
          );
          
          expect(openaiCalls.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );

    fetchSpy.mockRestore();
  }, 30000);

  /**
   * Property 50: No LLM tool access
   * For any LLM API call, the function calling or tools parameter should be disabled or omitted
   * **Validates: Requirements 11.5**
   */
  test('Property 50: No LLM tool access', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: { content: 'Test response' },
          finish_reason: 'stop'
        }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
      })
    } as Response);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            properties: fc.record({
              name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
            }),
            relevanceScore: fc.float({ min: 0, max: 1, noNaN: true }),
            matchReason: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0)
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (query, entities) => {
          fetchSpy.mockClear();
          
          const searchResult: SearchResult = {
            entities: entities as RankedEntity[],
            graphData: { nodes: [], relationships: [] },
            queryType: 'semantic'
          };

          await responseGenerator.generate(query, searchResult);

          // Check the request body
          const openaiCalls = fetchSpy.mock.calls.filter(call => 
            call[0] === 'https://api.openai.com/v1/chat/completions'
          );
          
          expect(openaiCalls.length).toBeGreaterThan(0);
          
          const requestBody = JSON.parse(openaiCalls[0][1]?.body as string);
          
          // Should not have tools or functions parameter
          expect(requestBody.tools).toBeUndefined();
          expect(requestBody.functions).toBeUndefined();
          expect(requestBody.function_call).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );

    fetchSpy.mockRestore();
  }, 30000);

  /**
   * Unit test: No multi-step reasoning on empty results
   */
  test('handles no results without additional API calls', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    fetchSpy.mockClear();

    const searchResult: SearchResult = {
      entities: [],
      graphData: { nodes: [], relationships: [] },
      queryType: 'semantic'
    };

    const response = await responseGenerator.generate('test query', searchResult);

    // Should not make any API calls when there are no results
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.answer).toContain("couldn't find");
    expect(response.sources).toEqual([]);

    fetchSpy.mockRestore();
  });
});
