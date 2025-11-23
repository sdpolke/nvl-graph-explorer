/**
 * Property-Based Tests for Entity Mention Parser
 * 
 * Feature: semantic-search-chat, Property 10: Entity highlighting in responses
 * Validates: Requirements 3.3
 */

import { describe, test, expect } from 'vitest';
import fc from 'fast-check';
import { parseEntityMentions, detectEntityMentions } from './entityMentionParser';
import type { EntityMention } from '../components/chat/types';

describe('Property Tests: Entity Mention Parser', () => {
  /**
   * Property 10: Entity highlighting in responses
   * For any answer containing entity names, those names should be wrapped in clickable markdown links
   */
  test('Property 10: Entity highlighting in responses', () => {
    fc.assert(
      fc.property(
        // Generate random text content
        fc.string({ minLength: 10, maxLength: 200 }),
        // Generate random entity mentions
        fc.array(
          fc.record({
            type: fc.constantFrom('Drug', 'Disease', 'ClinicalDisease', 'Protein'),
            nodeId: fc.uuid(),
            startIndex: fc.nat({ max: 180 }),
            endIndex: fc.nat({ max: 200 })
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (content, rawEntities) => {
          // Filter entities to ensure valid ranges and no overlaps
          const validEntities = rawEntities
            .filter(e => e.startIndex < e.endIndex && e.endIndex <= content.length)
            .sort((a, b) => a.startIndex - b.startIndex);

          // Remove overlapping entities
          const nonOverlapping: typeof validEntities = [];
          let lastEnd = -1;
          for (const entity of validEntities) {
            if (entity.startIndex >= lastEnd) {
              nonOverlapping.push(entity);
              lastEnd = entity.endIndex;
            }
          }

          // Extract actual text from content
          const entities: EntityMention[] = nonOverlapping.map(e => ({
            ...e,
            text: content.substring(e.startIndex, e.endIndex),
            type: e.type as any
          }));

          const result = parseEntityMentions(content, entities);

          // Property: All entity mentions should be converted to markdown links
          entities.forEach(entity => {
            const expectedLink = `[**${entity.text}**](#entity-${entity.nodeId})`;
            expect(result).toContain(expectedLink);
          });

          // Property: Result should be a string
          expect(typeof result).toBe('string');

          // Property: If no entities, result should equal content
          if (entities.length === 0) {
            expect(result).toBe(content);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('parseEntityMentions handles empty entities array', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (content) => {
          const result = parseEntityMentions(content, []);
          expect(result).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('parseEntityMentions handles undefined entities', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (content) => {
          const result = parseEntityMentions(content, undefined);
          expect(result).toBe(content);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('parseEntityMentions preserves text outside entity ranges', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 20, maxLength: 100 }),
        fc.nat({ max: 80 }),
        fc.nat({ max: 10 }),
        fc.uuid(),
        (content, start, length, nodeId) => {
          const end = Math.min(start + length + 1, content.length);
          if (start >= end) return; // Skip invalid ranges

          const entityText = content.substring(start, end);
          const entities: EntityMention[] = [{
            text: entityText,
            type: 'Drug',
            nodeId,
            startIndex: start,
            endIndex: end
          }];

          const result = parseEntityMentions(content, entities);

          // Text before entity should be preserved
          const textBefore = content.substring(0, start);
          expect(result.startsWith(textBefore)).toBe(true);

          // Text after entity should be preserved
          const textAfter = content.substring(end);
          expect(result.endsWith(textAfter)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('parseEntityMentions handles overlapping entities correctly', () => {
    const content = 'Aspirin treats pain and inflammation';
    const entities: EntityMention[] = [
      {
        text: 'Aspirin',
        type: 'Drug',
        nodeId: 'drug-1',
        startIndex: 0,
        endIndex: 7
      },
      {
        text: 'pain',
        type: 'Disease',
        nodeId: 'disease-1',
        startIndex: 15,
        endIndex: 19
      },
      {
        text: 'inflammation',
        type: 'Disease',
        nodeId: 'disease-2',
        startIndex: 24,
        endIndex: 36
      }
    ];

    const result = parseEntityMentions(content, entities);

    // All entities should be converted to links
    expect(result).toContain('[**Aspirin**](#entity-drug-1)');
    expect(result).toContain('[**pain**](#entity-disease-1)');
    expect(result).toContain('[**inflammation**](#entity-disease-2)');

    // Text structure should be preserved
    expect(result).toContain('treats');
    expect(result).toContain('and');
  });

  test('detectEntityMentions finds all occurrences', () => {
    const content = 'Aspirin is a drug. Aspirin treats pain.';
    const entityNames = new Map([
      ['Aspirin', { type: 'Drug', nodeId: 'drug-1' }],
      ['pain', { type: 'Disease', nodeId: 'disease-1' }]
    ]);

    const mentions = detectEntityMentions(content, entityNames);

    // Should find both occurrences of Aspirin
    const aspirinMentions = mentions.filter(m => m.text === 'Aspirin');
    expect(aspirinMentions.length).toBe(2);

    // Should find pain
    const painMentions = mentions.filter(m => m.text === 'pain');
    expect(painMentions.length).toBe(1);
  });

  test('detectEntityMentions handles case-insensitive matching', () => {
    const content = 'ASPIRIN is a drug. aspirin treats pain.';
    const entityNames = new Map([
      ['Aspirin', { type: 'Drug', nodeId: 'drug-1' }]
    ]);

    const mentions = detectEntityMentions(content, entityNames);

    // Should find both case variations
    expect(mentions.length).toBe(2);
    expect(mentions[0].text).toBe('ASPIRIN');
    expect(mentions[1].text).toBe('aspirin');
  });

  test('detectEntityMentions avoids overlapping mentions', () => {
    const content = 'Diabetes mellitus is a disease';
    const entityNames = new Map([
      ['Diabetes mellitus', { type: 'Disease', nodeId: 'disease-1' }],
      ['Diabetes', { type: 'Disease', nodeId: 'disease-2' }]
    ]);

    const mentions = detectEntityMentions(content, entityNames);

    // Should only match the longer entity name
    expect(mentions.length).toBe(1);
    expect(mentions[0].text).toBe('Diabetes mellitus');
  });

  test('detectEntityMentions respects word boundaries', () => {
    const content = 'Aspirin and Aspirinate are different';
    const entityNames = new Map([
      ['Aspirin', { type: 'Drug', nodeId: 'drug-1' }]
    ]);

    const mentions = detectEntityMentions(content, entityNames);

    // Should only match "Aspirin", not "Aspirinate"
    expect(mentions.length).toBe(1);
    expect(mentions[0].text).toBe('Aspirin');
  });
});
