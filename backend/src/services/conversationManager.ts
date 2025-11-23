/**
 * Conversation Manager
 * Manages chat conversations with context tracking and LRU eviction
 */

import { randomUUID } from 'crypto';

export type EntityType = 'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  graphData?: GraphData;
}

export interface Source {
  entityType: EntityType;
  entityName: string;
  nodeId: string;
  relevanceScore: number;
  excerpt: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
}

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface ConversationContext {
  mentionedEntities: Set<string>;
  exploredRelationships: Set<string>;
  currentFocus?: EntityType;
  lastQuery?: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  private accessOrder: string[] = [];
  private maxConversations: number;
  private ttl: number;

  constructor(maxConversations: number = 100, ttl: number = 3600000) {
    this.maxConversations = maxConversations;
    this.ttl = ttl; // Default: 1 hour
  }

  /**
   * Create a new conversation with unique ID
   */
  createConversation(): Conversation {
    const id = randomUUID();
    const conversation: Conversation = {
      id,
      messages: [],
      context: {
        mentionedEntities: new Set(),
        exploredRelationships: new Set()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.set(id, conversation);
    this.updateAccessOrder(id);
    this.evictIfNeeded();

    return conversation;
  }

  /**
   * Add message to conversation with context tracking
   */
  async addMessage(conversationId: string, message: Message): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Update context based on message
    if (message.sources) {
      message.sources.forEach(source => {
        conversation.context.mentionedEntities.add(source.nodeId);
        
        // Update current focus to most recent entity type
        conversation.context.currentFocus = source.entityType;
      });
    }

    // Track explored relationships from graph data
    if (message.graphData?.relationships) {
      message.graphData.relationships.forEach(rel => {
        conversation.context.exploredRelationships.add(rel.id);
      });
    }

    // Store last query if user message
    if (message.role === 'user') {
      conversation.context.lastQuery = message.content;
    }

    this.updateAccessOrder(conversationId);
  }

  /**
   * Get conversation context for follow-up queries
   */
  async getContext(conversationId: string): Promise<ConversationContext> {
    const conversation = this.conversations.get(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    this.updateAccessOrder(conversationId);
    return conversation.context;
  }

  /**
   * Get full conversation by ID
   */
  getConversation(conversationId: string): Conversation | undefined {
    const conversation = this.conversations.get(conversationId);
    
    if (conversation) {
      this.updateAccessOrder(conversationId);
    }
    
    return conversation;
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
    this.accessOrder = this.accessOrder.filter(id => id !== conversationId);
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(conversationId: string): void {
    // Remove from current position
    this.accessOrder = this.accessOrder.filter(id => id !== conversationId);
    
    // Add to end (most recently used)
    this.accessOrder.push(conversationId);
  }

  /**
   * Evict least recently used conversations if over limit
   */
  private evictIfNeeded(): void {
    // Evict expired conversations
    const now = Date.now();
    for (const [id, conversation] of this.conversations.entries()) {
      const age = now - conversation.updatedAt.getTime();
      if (age > this.ttl) {
        this.conversations.delete(id);
        this.accessOrder = this.accessOrder.filter(cid => cid !== id);
      }
    }

    // Evict LRU conversations if over max
    while (this.conversations.size > this.maxConversations) {
      const lruId = this.accessOrder.shift();
      if (lruId) {
        this.conversations.delete(lruId);
      }
    }
  }

  /**
   * Get conversation count (for testing)
   */
  getConversationCount(): number {
    return this.conversations.size;
  }

  /**
   * Clear all conversations (for testing)
   */
  clearAll(): void {
    this.conversations.clear();
    this.accessOrder = [];
  }
}

export const conversationManager = new ConversationManager();
