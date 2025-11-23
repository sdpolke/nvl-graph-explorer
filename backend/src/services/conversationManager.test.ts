/**
 * Property-Based Tests for ConversationManager
 * 
 * These tests validate correctness properties using fast-check
 */

import fc from 'fast-check';
import { ConversationManager, Message } from './conversationManager';

describe('ConversationManager Property Tests', () => {
  let conversationManager: ConversationManager;

  beforeEach(() => {
    conversationManager = new ConversationManager();
  });

  afterEach(() => {
    conversationManager.clearAll();
  });

  /**
   * Feature: semantic-search-chat, Property 12: Conversation ID uniqueness
   * 
   * For any new conversation, the generated ID should not match any 
   * existing conversation ID in the system
   * 
   * Validates: Requirements 4.1
   */
  describe('Property 12: Conversation ID uniqueness', () => {
    test('should generate unique IDs for all conversations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 100 }),
          (numConversations) => {
            const ids = new Set<string>();
            
            for (let i = 0; i < numConversations; i++) {
              const conv = conversationManager.createConversation();
              
              // Property: ID must not already exist
              expect(ids.has(conv.id)).toBe(false);
              
              ids.add(conv.id);
            }
            
            // Property: All IDs must be unique
            expect(ids.size).toBe(numConversations);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should generate valid UUID format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (numConversations) => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            
            for (let i = 0; i < numConversations; i++) {
              const conv = conversationManager.createConversation();
              
              // Property: ID must be valid UUID format
              expect(conv.id).toMatch(uuidRegex);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 13: Context retrieval for follow-ups
   * 
   * For any follow-up message in an existing conversation, the system 
   * should retrieve the conversation history before processing
   * 
   * Validates: Requirements 4.2
   */
  describe('Property 13: Context retrieval for follow-ups', () => {
    test('should retrieve context for existing conversations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              role: fc.constantFrom('user' as const, 'assistant' as const),
              content: fc.string({ minLength: 1, maxLength: 200 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (messages) => {
            // Create conversation
            const conv = conversationManager.createConversation();
            
            // Add messages
            for (const msg of messages) {
              await conversationManager.addMessage(conv.id, {
                ...msg,
                timestamp: new Date(),
              });
            }
            
            // Property: Context should be retrievable
            const context = await conversationManager.getContext(conv.id);
            
            expect(context).toBeDefined();
            expect(context.mentionedEntities).toBeDefined();
            expect(context.exploredRelationships).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should throw error for non-existent conversation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (fakeId) => {
            // Property: Getting context for non-existent conversation should throw
            await expect(
              conversationManager.getContext(fakeId)
            ).rejects.toThrow(`Conversation ${fakeId} not found`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 15: Context retention
   * 
   * For any conversation with more than 10 messages, all messages 
   * should be retrievable from the conversation store
   * 
   * Validates: Requirements 4.4
   */
  describe('Property 15: Context retention', () => {
    test('should retain all messages regardless of count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 11, max: 50 }),
          async (numMessages) => {
            // Create conversation
            const conv = conversationManager.createConversation();
            
            // Add messages
            const messages: Message[] = [];
            for (let i = 0; i < numMessages; i++) {
              const msg: Message = {
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: `Message ${i}`,
                timestamp: new Date(),
              };
              messages.push(msg);
              await conversationManager.addMessage(conv.id, msg);
            }
            
            // Property: All messages should be retained
            const retrieved = conversationManager.getConversation(conv.id);
            expect(retrieved).toBeDefined();
            expect(retrieved!.messages).toHaveLength(numMessages);
            
            // Property: Messages should be in order
            retrieved!.messages.forEach((msg, idx) => {
              expect(msg.content).toBe(`Message ${idx}`);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should retain messages with sources and graph data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              role: fc.constantFrom('user' as const, 'assistant' as const),
              content: fc.string({ minLength: 1 }),
              hasSources: fc.boolean(),
              hasGraphData: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (messageSpecs) => {
            const conv = conversationManager.createConversation();
            
            for (const spec of messageSpecs) {
              const msg: Message = {
                role: spec.role,
                content: spec.content,
                timestamp: new Date(),
              };
              
              if (spec.hasSources) {
                msg.sources = [{
                  entityType: 'Drug',
                  entityName: 'Test Drug',
                  nodeId: 'node-123',
                  relevanceScore: 0.9,
                  excerpt: 'Test excerpt',
                  properties: {},
                }];
              }
              
              if (spec.hasGraphData) {
                msg.graphData = {
                  nodes: [],
                  relationships: [],
                };
              }
              
              await conversationManager.addMessage(conv.id, msg);
            }
            
            // Property: All messages with metadata should be retained
            const retrieved = conversationManager.getConversation(conv.id);
            expect(retrieved!.messages).toHaveLength(messageSpecs.length);
            
            retrieved!.messages.forEach((msg, idx) => {
              if (messageSpecs[idx].hasSources) {
                expect(msg.sources).toBeDefined();
              }
              if (messageSpecs[idx].hasGraphData) {
                expect(msg.graphData).toBeDefined();
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 16: Context isolation
   * 
   * For any new conversation, the conversation context should not 
   * contain entities from other conversations
   * 
   * Validates: Requirements 4.5
   */
  describe('Property 16: Context isolation', () => {
    test('should isolate context between conversations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
          async (entityIds1Raw, entityIds2Raw) => {
            // Ensure arrays are distinct by prefixing and adding index for uniqueness
            const entityIds1 = entityIds1Raw.map((id, idx) => `conv1-${idx}-${id}`);
            const entityIds2 = entityIds2Raw.map((id, idx) => `conv2-${idx}-${id}`);
            // Create first conversation and add entities
            const conv1 = conversationManager.createConversation();
            
            for (const entityId of entityIds1) {
              const msg: Message = {
                role: 'assistant',
                content: 'Test message',
                timestamp: new Date(),
                sources: [{
                  entityType: 'Drug',
                  entityName: 'Test',
                  nodeId: entityId,
                  relevanceScore: 0.9,
                  excerpt: 'Test',
                  properties: {},
                }],
              };
              await conversationManager.addMessage(conv1.id, msg);
            }
            
            // Create second conversation
            const conv2 = conversationManager.createConversation();
            
            // Property: conv2 should not have conv1's entities
            const context2 = await conversationManager.getContext(conv2.id);
            
            entityIds1.forEach(id => {
              expect(context2.mentionedEntities.has(id)).toBe(false);
            });
            
            // Add entities to conv2
            for (const entityId of entityIds2) {
              const msg: Message = {
                role: 'assistant',
                content: 'Test message',
                timestamp: new Date(),
                sources: [{
                  entityType: 'Disease',
                  entityName: 'Test',
                  nodeId: entityId,
                  relevanceScore: 0.9,
                  excerpt: 'Test',
                  properties: {},
                }],
              };
              await conversationManager.addMessage(conv2.id, msg);
            }
            
            // Property: conv1 should not have conv2's entities
            const context1 = await conversationManager.getContext(conv1.id);
            
            entityIds2.forEach(id => {
              expect(context1.mentionedEntities.has(id)).toBe(false);
            });
            
            // Property: Each conversation should only have its own entities
            expect(context1.mentionedEntities.size).toBe(entityIds1.length);
            expect(context2.mentionedEntities.size).toBe(entityIds2.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should isolate explored relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          async (relIds) => {
            // Create two conversations
            const conv1 = conversationManager.createConversation();
            const conv2 = conversationManager.createConversation();
            
            // Add relationships to conv1
            const msg1: Message = {
              role: 'assistant',
              content: 'Test',
              timestamp: new Date(),
              graphData: {
                nodes: [],
                relationships: relIds.map(id => ({
                  id,
                  type: 'TEST',
                  startNodeId: 'start',
                  endNodeId: 'end',
                  properties: {},
                })),
              },
            };
            await conversationManager.addMessage(conv1.id, msg1);
            
            // Property: conv2 should not have conv1's relationships
            const context2 = await conversationManager.getContext(conv2.id);
            
            relIds.forEach(id => {
              expect(context2.exploredRelationships.has(id)).toBe(false);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 14: Reference resolution
   * 
   * For any message containing pronouns ("it", "that", "them") in a 
   * conversation with previous entity mentions, the system should 
   * resolve the reference to a specific entity
   * 
   * Validates: Requirements 4.3
   */
  describe('Property 14: Reference resolution', () => {
    test('should provide context for pronoun resolution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          fc.constantFrom('it', 'that', 'them', 'this', 'those'),
          async (entityIds, pronoun) => {
            // Create conversation and add entities
            const conv = conversationManager.createConversation();
            
            // Add initial message with entities
            const msg1: Message = {
              role: 'assistant',
              content: 'Here are some entities',
              timestamp: new Date(),
              sources: entityIds.map(id => ({
                entityType: 'Drug',
                entityName: `Entity ${id}`,
                nodeId: id,
                relevanceScore: 0.9,
                excerpt: 'Test',
                properties: {},
              })),
            };
            await conversationManager.addMessage(conv.id, msg1);
            
            // Add follow-up message with pronoun
            const msg2: Message = {
              role: 'user',
              content: `Tell me more about ${pronoun}`,
              timestamp: new Date(),
            };
            await conversationManager.addMessage(conv.id, msg2);
            
            // Property: Context should contain mentioned entities for resolution
            const context = await conversationManager.getContext(conv.id);
            
            expect(context.mentionedEntities.size).toBeGreaterThan(0);
            expect(context.lastQuery).toContain(pronoun);
            
            // Property: All mentioned entities should be available
            entityIds.forEach(id => {
              expect(context.mentionedEntities.has(id)).toBe(true);
            });
            
            // Property: Current focus should be set for disambiguation
            expect(context.currentFocus).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should maintain entity order for recency-based resolution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              entityId: fc.string({ minLength: 1 }),
              entityType: fc.constantFrom('Drug', 'Disease', 'Protein', 'ClinicalDisease'),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (entitiesRaw) => {
            // Make entity IDs unique by adding index
            const entities = entitiesRaw.map((e, idx) => ({
              ...e,
              entityId: `${idx}-${e.entityId}`
            }));
            
            const conv = conversationManager.createConversation();
            
            // Add messages with different entities over time
            for (const entity of entities) {
              const msg: Message = {
                role: 'assistant',
                content: `Information about ${entity.entityId}`,
                timestamp: new Date(),
                sources: [{
                  entityType: entity.entityType as any,
                  entityName: entity.entityId,
                  nodeId: entity.entityId,
                  relevanceScore: 0.9,
                  excerpt: 'Test',
                  properties: {},
                }],
              };
              await conversationManager.addMessage(conv.id, msg);
              
              // Small delay to ensure timestamp ordering
              await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            // Property: Context should have all entities (now unique)
            const context = await conversationManager.getContext(conv.id);
            expect(context.mentionedEntities.size).toBe(entities.length);
            
            // Property: Current focus should be the most recent entity type
            const lastEntityType = entities[entities.length - 1].entityType;
            expect(context.currentFocus).toBe(lastEntityType);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle multiple entity types for disambiguation', async () => {
      const conv = conversationManager.createConversation();
      
      // Add message with multiple entity types
      const msg: Message = {
        role: 'assistant',
        content: 'Here are related entities',
        timestamp: new Date(),
        sources: [
          {
            entityType: 'Drug',
            entityName: 'Aspirin',
            nodeId: 'drug-1',
            relevanceScore: 0.9,
            excerpt: 'Test',
            properties: {},
          },
          {
            entityType: 'Disease',
            entityName: 'Diabetes',
            nodeId: 'disease-1',
            relevanceScore: 0.8,
            excerpt: 'Test',
            properties: {},
          },
          {
            entityType: 'Protein',
            entityName: 'Insulin',
            nodeId: 'protein-1',
            relevanceScore: 0.7,
            excerpt: 'Test',
            properties: {},
          },
        ],
      };
      await conversationManager.addMessage(conv.id, msg);
      
      // Add follow-up with pronoun
      const followUp: Message = {
        role: 'user',
        content: 'What are the side effects of that?',
        timestamp: new Date(),
      };
      await conversationManager.addMessage(conv.id, followUp);
      
      const context = await conversationManager.getContext(conv.id);
      
      // Context should have all entities for resolution
      expect(context.mentionedEntities.has('drug-1')).toBe(true);
      expect(context.mentionedEntities.has('disease-1')).toBe(true);
      expect(context.mentionedEntities.has('protein-1')).toBe(true);
      
      // Current focus should help disambiguate (last entity type)
      expect(context.currentFocus).toBe('Protein');
      
      // Last query should be available
      expect(context.lastQuery).toBe('What are the side effects of that?');
    });
  });

  /**
   * Additional unit tests for edge cases and functionality
   */
  describe('Unit Tests: Context Tracking', () => {
    test('should track mentioned entities from sources', async () => {
      const conv = conversationManager.createConversation();
      
      const msg: Message = {
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        sources: [
          {
            entityType: 'Drug',
            entityName: 'Aspirin',
            nodeId: 'drug-1',
            relevanceScore: 0.9,
            excerpt: 'Test',
            properties: {},
          },
          {
            entityType: 'Disease',
            entityName: 'Diabetes',
            nodeId: 'disease-1',
            relevanceScore: 0.8,
            excerpt: 'Test',
            properties: {},
          },
        ],
      };
      
      await conversationManager.addMessage(conv.id, msg);
      
      const context = await conversationManager.getContext(conv.id);
      expect(context.mentionedEntities.has('drug-1')).toBe(true);
      expect(context.mentionedEntities.has('disease-1')).toBe(true);
      expect(context.currentFocus).toBe('Disease'); // Last entity type
    });

    test('should track explored relationships', async () => {
      const conv = conversationManager.createConversation();
      
      const msg: Message = {
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        graphData: {
          nodes: [],
          relationships: [
            {
              id: 'rel-1',
              type: 'TREATS',
              startNodeId: 'drug-1',
              endNodeId: 'disease-1',
              properties: {},
            },
          ],
        },
      };
      
      await conversationManager.addMessage(conv.id, msg);
      
      const context = await conversationManager.getContext(conv.id);
      expect(context.exploredRelationships.has('rel-1')).toBe(true);
    });

    test('should store last query from user messages', async () => {
      const conv = conversationManager.createConversation();
      
      const userMsg: Message = {
        role: 'user',
        content: 'What treats diabetes?',
        timestamp: new Date(),
      };
      
      await conversationManager.addMessage(conv.id, userMsg);
      
      const context = await conversationManager.getContext(conv.id);
      expect(context.lastQuery).toBe('What treats diabetes?');
    });

    test('should update timestamps on message addition', async () => {
      const conv = conversationManager.createConversation();
      const initialUpdatedAt = conv.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const msg: Message = {
        role: 'user',
        content: 'Test',
        timestamp: new Date(),
      };
      
      await conversationManager.addMessage(conv.id, msg);
      
      const retrieved = conversationManager.getConversation(conv.id);
      expect(retrieved!.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
    });
  });

  describe('Unit Tests: LRU Eviction', () => {
    test('should evict least recently used conversations', () => {
      const manager = new ConversationManager(3); // Max 3 conversations
      
      const conv1 = manager.createConversation();
      const conv2 = manager.createConversation();
      const conv3 = manager.createConversation();
      
      expect(manager.getConversationCount()).toBe(3);
      
      // Create 4th conversation - should evict conv1
      const conv4 = manager.createConversation();
      
      expect(manager.getConversationCount()).toBe(3);
      expect(manager.getConversation(conv1.id)).toBeUndefined();
      expect(manager.getConversation(conv2.id)).toBeDefined();
      expect(manager.getConversation(conv3.id)).toBeDefined();
      expect(manager.getConversation(conv4.id)).toBeDefined();
    });

    test('should update access order on getContext', async () => {
      const manager = new ConversationManager(3);
      
      const conv1 = manager.createConversation();
      const conv2 = manager.createConversation();
      const conv3 = manager.createConversation();
      
      // Access conv1 to make it most recently used
      await manager.getContext(conv1.id);
      
      // Create 4th conversation - should evict conv2 (least recently used)
      const conv4 = manager.createConversation();
      
      expect(manager.getConversation(conv1.id)).toBeDefined();
      expect(manager.getConversation(conv2.id)).toBeUndefined();
      expect(manager.getConversation(conv3.id)).toBeDefined();
      expect(manager.getConversation(conv4.id)).toBeDefined();
    });

    test('should evict expired conversations', async () => {
      const manager = new ConversationManager(100, 100); // 100ms TTL
      
      const conv = manager.createConversation();
      expect(manager.getConversation(conv.id)).toBeDefined();
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Create new conversation to trigger eviction check
      manager.createConversation();
      
      // Expired conversation should be evicted
      expect(manager.getConversation(conv.id)).toBeUndefined();
    });
  });

  describe('Unit Tests: Conversation Management', () => {
    test('should clear specific conversation', async () => {
      const conv1 = conversationManager.createConversation();
      const conv2 = conversationManager.createConversation();
      
      await conversationManager.clearConversation(conv1.id);
      
      expect(conversationManager.getConversation(conv1.id)).toBeUndefined();
      expect(conversationManager.getConversation(conv2.id)).toBeDefined();
    });

    test('should clear all conversations', () => {
      conversationManager.createConversation();
      conversationManager.createConversation();
      
      expect(conversationManager.getConversationCount()).toBe(2);
      
      conversationManager.clearAll();
      
      expect(conversationManager.getConversationCount()).toBe(0);
    });

    test('should return undefined for non-existent conversation', () => {
      const result = conversationManager.getConversation('non-existent-id');
      expect(result).toBeUndefined();
    });
  });
});
