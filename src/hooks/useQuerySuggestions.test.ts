import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQuerySuggestions } from './useQuerySuggestions';
import * as fc from 'fast-check';
import type { QuerySuggestion, QuerySuggestionCategory } from '../types';

describe('useQuerySuggestions', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn();
  });

  it('loads suggestions from JSON file', async () => {
    const mockData = {
      version: '1.0',
      description: 'Test suggestions',
      categories: [
        {
          id: 'test-category',
          name: 'Test Category',
          order: 1,
          suggestions: [
            {
              id: 'test-1',
              query: 'Test query',
              complexity: 'basic',
            },
          ],
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });

    const { result } = renderHook(() => useQuerySuggestions());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0].name).toBe('Test Category');
    expect(result.current.error).toBeNull();
  });

  it('handles malformed JSON gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => 'invalid json {',
    });

    const { result } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.error).toContain('Malformed JSON');
  });

  it('handles fetch errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.error).toContain('Failed to load suggestions');
  });

  it('validates JSON structure', async () => {
    const invalidData = {
      version: '1.0',
      categories: [
        {
          id: 'test',
          name: 'Test',
          suggestions: 'not-an-array',
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(invalidData),
    });

    const { result } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions).toHaveLength(0);
    expect(result.current.error).toContain('Invalid');
  });

  it('caches loaded suggestions', async () => {
    const mockData = {
      version: '1.0',
      description: 'Test',
      categories: [
        {
          id: 'test',
          name: 'Test',
          order: 1,
          suggestions: [
            {
              id: 'test-1',
              query: 'Test',
              complexity: 'basic',
            },
          ],
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });

    const { result, unmount } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    unmount();

    const { result: result2 } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result2.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result2.current.suggestions).toHaveLength(1);
  });

  it('sorts categories by order property', async () => {
    const mockData = {
      version: '1.0',
      description: 'Test',
      categories: [
        {
          id: 'third',
          name: 'Third',
          order: 3,
          suggestions: [{ id: '1', query: 'Test', complexity: 'basic' }],
        },
        {
          id: 'first',
          name: 'First',
          order: 1,
          suggestions: [{ id: '2', query: 'Test', complexity: 'basic' }],
        },
        {
          id: 'second',
          name: 'Second',
          order: 2,
          suggestions: [{ id: '3', query: 'Test', complexity: 'basic' }],
        },
      ],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });

    const { result } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.suggestions[0].name).toBe('First');
    expect(result.current.suggestions[1].name).toBe('Second');
    expect(result.current.suggestions[2].name).toBe('Third');
  });

  it('reload clears cache and refetches', async () => {
    const mockData = {
      version: '1.0',
      description: 'Test',
      categories: [
        {
          id: 'test',
          name: 'Test',
          order: 1,
          suggestions: [{ id: '1', query: 'Test', complexity: 'basic' }],
        },
      ],
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockData),
    });

    const { result } = renderHook(() => useQuerySuggestions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    await result.current.reload();

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  /**
   * Property-Based Test: Complexity metadata presence
   * Feature: query-suggestions, Property 12: Complexity metadata presence
   * 
   * For any query suggestion loaded from the configuration, the suggestion object 
   * should contain a complexity field with a valid value ('basic', 'intermediate', or 'advanced')
   * 
   * Validates: Requirements 7.5
   */
  it(
    'property test: all suggestions have valid complexity metadata',
    async () => {
      // Generator for valid complexity values
      const complexityArb = fc.constantFrom('basic', 'intermediate', 'advanced');

      // Generator for QuerySuggestion objects
      const suggestionArb = fc.record({
        id: fc.string({ minLength: 1 }),
        query: fc.string({ minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined }),
        complexity: complexityArb,
        tags: fc.option(fc.array(fc.string()), { nil: undefined }),
      });

      // Generator for QuerySuggestionCategory objects
      const categoryArb = fc.record({
        id: fc.string({ minLength: 1 }),
        name: fc.string({ minLength: 1 }),
        description: fc.option(fc.string(), { nil: undefined }),
        icon: fc.option(fc.string(), { nil: undefined }),
        order: fc.integer({ min: 1, max: 100 }),
        suggestions: fc.array(suggestionArb, { minLength: 1, maxLength: 10 }),
      });

      // Generator for the complete data structure
      const dataArb = fc.record({
        version: fc.string({ minLength: 1 }),
        description: fc.string(),
        categories: fc.array(categoryArb, { minLength: 1, maxLength: 5 }),
      });

      await fc.assert(
        fc.asyncProperty(dataArb, async (mockData) => {
          sessionStorage.clear();

          (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            text: async () => JSON.stringify(mockData),
          });

          const { result } = renderHook(() => useQuerySuggestions());

          await waitFor(
            () => {
              expect(result.current.isLoading).toBe(false);
            },
            { timeout: 1000 }
          );

          // Property: All suggestions must have valid complexity metadata
          const allSuggestions: QuerySuggestion[] = result.current.suggestions.flatMap(
            (category: QuerySuggestionCategory) => category.suggestions
          );

          for (const suggestion of allSuggestions) {
            // Each suggestion must have a complexity field
            expect(suggestion.complexity).toBeDefined();

            // The complexity must be one of the valid values
            expect(['basic', 'intermediate', 'advanced']).toContain(suggestion.complexity);
          }
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});
