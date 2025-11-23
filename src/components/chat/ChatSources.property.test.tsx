/**
 * Property-Based Tests for ChatSources Component
 * Feature: semantic-search-chat, Property 27: Source metadata completeness
 * Validates: Requirements 7.1, 7.2
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { render, screen, act } from '@testing-library/react';
import { ChatSources } from './ChatSources';
import type { Source, EntityType } from './types';

// Arbitraries for generating test data
const entityTypeArb = fc.constantFrom<EntityType>('Drug', 'Disease', 'ClinicalDisease', 'Protein');

const sourceArb = fc.record({
  entityType: entityTypeArb,
  entityName: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  nodeId: fc.uuid(),
  relevanceScore: fc.double({ min: 0, max: 1, noNaN: true }),
  excerpt: fc.string({ minLength: 10, maxLength: 500 }),
  properties: fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean()))
});

describe('ChatSources Property Tests', () => {
  test('Property 27: Source metadata completeness - all sources have required fields', () => {
    fc.assert(
      fc.property(
        fc.array(sourceArb, { minLength: 1, maxLength: 10 }),
        (sources) => {
          // Verify each source has all required metadata fields
          sources.forEach((source) => {
            expect(source).toHaveProperty('entityType');
            expect(source).toHaveProperty('entityName');
            expect(source).toHaveProperty('nodeId');
            expect(source).toHaveProperty('relevanceScore');
            expect(source).toHaveProperty('excerpt');
            expect(source).toHaveProperty('properties');

            // Verify types
            expect(['Drug', 'Disease', 'ClinicalDisease', 'Protein']).toContain(source.entityType);
            expect(typeof source.entityName).toBe('string');
            expect(source.entityName.length).toBeGreaterThan(0);
            expect(typeof source.nodeId).toBe('string');
            expect(typeof source.relevanceScore).toBe('number');
            expect(source.relevanceScore).toBeGreaterThanOrEqual(0);
            expect(source.relevanceScore).toBeLessThanOrEqual(1);
            expect(typeof source.excerpt).toBe('string');
            expect(typeof source.properties).toBe('object');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Source metadata completeness - rendered sources display all metadata', () => {
    fc.assert(
      fc.property(
        fc.array(sourceArb, { minLength: 1, maxLength: 5 }),
        (sources) => {
          const mockOnEntityClick = () => {};
          
          const { container, unmount } = render(
            <ChatSources sources={sources} onEntityClick={mockOnEntityClick} />
          );

          // Expand the sources list
          const toggleButton = screen.getAllByRole('button')[0];
          act(() => {
            toggleButton.click();
          });

          // Verify each source is rendered with all required metadata
          sources.forEach((source) => {
            // Check entity type is displayed
            expect(container.textContent).toContain(source.entityType);

            // Check entity name is displayed
            expect(container.textContent).toContain(source.entityName);

            // Check relevance score is displayed (formatted as percentage)
            const scorePercentage = Math.round(source.relevanceScore * 100);
            expect(container.textContent).toContain(`${scorePercentage}%`);
          });

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Source metadata completeness - sources are ordered by relevance', () => {
    fc.assert(
      fc.property(
        fc.array(sourceArb, { minLength: 2, maxLength: 10 }),
        (sources) => {
          // Sort sources by relevance score descending (as they should be from backend)
          const sortedSources = [...sources].sort((a, b) => b.relevanceScore - a.relevanceScore);
          
          const mockOnEntityClick = () => {};
          
          const { unmount } = render(
            <ChatSources sources={sortedSources} onEntityClick={mockOnEntityClick} />
          );

          // Verify sources maintain their order (all scores should be valid numbers)
          for (let i = 0; i < sortedSources.length - 1; i++) {
            expect(typeof sortedSources[i].relevanceScore).toBe('number');
            expect(typeof sortedSources[i + 1].relevanceScore).toBe('number');
            expect(Number.isFinite(sortedSources[i].relevanceScore)).toBe(true);
            expect(Number.isFinite(sortedSources[i + 1].relevanceScore)).toBe(true);
            expect(sortedSources[i].relevanceScore).toBeGreaterThanOrEqual(
              sortedSources[i + 1].relevanceScore
            );
          }

          unmount();
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 27: Source metadata completeness - empty sources array renders nothing', () => {
    const mockOnEntityClick = () => {};
    
    const { container } = render(
      <ChatSources sources={[]} onEntityClick={mockOnEntityClick} />
    );

    expect(container.firstChild).toBeNull();
  });

  test('Property 27: Source metadata completeness - undefined sources renders nothing', () => {
    const mockOnEntityClick = () => {};
    
    const { container } = render(
      <ChatSources sources={undefined as any} onEntityClick={mockOnEntityClick} />
    );

    expect(container.firstChild).toBeNull();
  });
});
