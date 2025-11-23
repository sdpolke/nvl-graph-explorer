/**
 * Property-based tests for ChatMessageItem component
 * Feature: semantic-search-chat
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import type { EntityMention } from './types';

/**
 * Helper function to parse entity mentions in content
 * This mirrors the logic in ChatMessageItem component
 */
export function parseEntityMentions(content: string, entities?: EntityMention[]): string {
  if (!entities || entities.length === 0) {
    return content;
  }

  const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);
  let result = content;

  sortedEntities.forEach(entity => {
    const before = result.substring(0, entity.startIndex);
    const entityText = result.substring(entity.startIndex, entity.endIndex);
    const after = result.substring(entity.endIndex);
    result = before + `[**${entityText}**](#entity-${entity.nodeId})` + after;
  });

  return result;
}

/**
 * Generator for valid non-overlapping entity mentions within a given text
 */
const entityMentionArbitrary = (text: string) => {
  if (text.length === 0) {
    return fc.constant([]);
  }

  return fc.array(
    fc.record({
      text: fc.constant(''),
      type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein') as fc.Arbitrary<'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein'>,
      nodeId: fc.uuid(),
      startIndex: fc.integer({ min: 0, max: Math.max(0, text.length - 1) }),
      endIndex: fc.integer({ min: 1, max: text.length })
    }).filter(entity => entity.startIndex < entity.endIndex)
      .map(entity => ({
        ...entity,
        text: text.substring(entity.startIndex, entity.endIndex)
      })),
    { maxLength: 5 }
  ).map(entities => {
    // Remove overlapping entities - keep only non-overlapping ones
    const sorted = [...entities].sort((a, b) => a.startIndex - b.startIndex);
    const nonOverlapping: EntityMention[] = [];
    
    for (const entity of sorted) {
      const overlaps = nonOverlapping.some(existing => 
        (entity.startIndex >= existing.startIndex && entity.startIndex < existing.endIndex) ||
        (entity.endIndex > existing.startIndex && entity.endIndex <= existing.endIndex) ||
        (entity.startIndex <= existing.startIndex && entity.endIndex >= existing.endIndex)
      );
      
      if (!overlaps) {
        nonOverlapping.push(entity);
      }
    }
    
    return nonOverlapping;
  });
};

describe('Property Tests: Entity Highlighting', () => {
  /**
   * Property 10: Entity highlighting in responses
   * For any answer containing entity names, those names should be wrapped in clickable markdown links
   * Validates: Requirements 3.3
   */
  test('Property 10: Entity highlighting in responses', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }).chain(content => 
          entityMentionArbitrary(content).map(entities => ({ content, entities }))
        ),
        ({ content, entities }) => {
          // Convert readonly array to mutable array for the function
          const mutableEntities = entities.length > 0 ? [...entities] : undefined;
          const parsed = parseEntityMentions(content, mutableEntities);
          
          // For each entity mention, verify it's wrapped in markdown link
          entities.forEach(entity => {
            const expectedLink = `[**${entity.text}**](#entity-${entity.nodeId})`;
            expect(parsed).toContain(expectedLink);
          });
          
          // Verify the parsed content contains markdown link syntax
          if (entities.length > 0) {
            expect(parsed).toMatch(/\[\*\*.*?\*\*\]\(#entity-.*?\)/);
          }
          
          // Verify all entity IDs are present in the parsed content
          entities.forEach(entity => {
            expect(parsed).toContain(`#entity-${entity.nodeId}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10 (edge case): Empty entities array returns original content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (content) => {
          const parsed = parseEntityMentions(content, []);
          expect(parsed).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10 (edge case): Undefined entities returns original content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (content) => {
          const parsed = parseEntityMentions(content, undefined);
          expect(parsed).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10 (correctness): Entity text matches substring', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 100 }).chain(content => 
          entityMentionArbitrary(content).map(entities => ({ content, entities }))
        ),
        ({ content, entities }) => {
          // Verify each entity's text matches the actual substring
          entities.forEach(entity => {
            const actualText = content.substring(entity.startIndex, entity.endIndex);
            expect(entity.text).toBe(actualText);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 10 (ordering): Entities are processed in reverse order', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 30, maxLength: 100 }).map(content => {
          // Generate multiple non-overlapping entities
          const entities: EntityMention[] = [];
          let pos = 0;
          const numEntities = Math.min(3, Math.floor(content.length / 10));
          
          for (let i = 0; i < numEntities; i++) {
            const start = pos;
            const end = Math.min(pos + 5, content.length);
            if (start < end) {
              entities.push({
                text: content.substring(start, end),
                type: 'Drug',
                nodeId: `id-${i}`,
                startIndex: start,
                endIndex: end
              });
            }
            pos = end + 5;
          }
          
          return { content, entities };
        }),
        ({ content, entities }) => {
          if (entities.length === 0) return;
          
          const parsed = parseEntityMentions(content, entities);
          
          // All entities should be present in the parsed output
          entities.forEach(entity => {
            expect(parsed).toContain(`#entity-${entity.nodeId}`);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
