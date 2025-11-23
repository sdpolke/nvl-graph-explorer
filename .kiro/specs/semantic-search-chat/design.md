# Design Document: Semantic Search & Chat Interface

## Overview

This design document specifies the implementation of a hybrid semantic search system with an interactive chat interface for the biomedical knowledge graph explorer. The system combines vector embeddings (semantic similarity) with graph traversal (structural relationships) to enable natural language question answering through a simple RAG (Retrieval-Augmented Generation) pipeline.

### Key Design Principles

1. **Simple RAG Pattern**: Deterministic three-step pipeline (retrieve → expand → generate) without agentic complexity
2. **Neo4j-Native Vector Storage**: Use Neo4j 5.26+ built-in vector indexes to avoid external dependencies
3. **Hybrid Search**: Combine semantic similarity with graph structure for comprehensive results
4. **Non-Intrusive UI**: Floating/dockable chat interface that doesn't obstruct graph visualization
5. **Source Transparency**: All answers include citations with relevance scores

### Architecture Decision: Neo4j Vector Index vs External Vector DB

**Selected Approach: Neo4j Vector Index**

Rationale:
- Neo4j 5.26+ includes native vector search capabilities
- Single database for both graph and vector data (no synchronization issues)
- Atomic queries combining vector search and graph traversal
- Lower operational complexity and cost
- Sufficient performance for ~25,000 entities

Alternative (Pinecone/Weaviate) would be considered if:
- Scale exceeds 1M+ entities
- Need advanced vector search features (hybrid search, filtering)
- Require sub-50ms vector search latency

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  GraphCanvas     │  │  ChatInterface   │                │
│  │  (Existing)      │  │  (New)           │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Node.js/Express)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Chat API (/api/chat)                                │  │
│  │  - Message handling                                  │  │
│  │  - Conversation management                           │  │
│  │  - Query routing                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Hybrid Search Service                               │  │
│  │  - Vector search                                     │  │
│  │  - Graph expansion                                   │  │
│  │  - Result ranking                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Embedding Service                                   │  │
│  │  - Generate embeddings (OpenAI)                      │  │
│  │  - Batch processing                                  │  │
│  │  - Incremental updates                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Bolt Protocol
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Neo4j Database                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Graph Data                                          │  │
│  │  - Nodes: Drug, Disease, Protein, ClinicalDisease   │  │
│  │  - Relationships: TREATS, INTERACTS_WITH, etc.      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Vector Indexes                                      │  │
│  │  - drug_embeddings (1536-dim)                        │  │
│  │  - disease_embeddings (1536-dim)                     │  │
│  │  - protein_embeddings (1536-dim)                     │  │
│  │  - clinical_disease_embeddings (1536-dim)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      OpenAI API                              │
│  - text-embedding-3-small (embeddings)                      │
│  - gpt-4o-mini (chat generation)                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Chat Query Processing

```
1. User Input
   "What drugs treat diabetes?"
   │
   ▼
2. Query Embedding
   OpenAI text-embedding-3-small
   → [0.123, -0.456, ..., 0.789] (1536-dim vector)
   │
   ▼
3. Vector Search (Neo4j)
   CALL db.index.vector.queryNodes('disease_embeddings', 10, queryVector)
   → Top 10 semantically similar entities
   │
   ▼
4. Graph Expansion (Neo4j)
   MATCH (entity)-[r*1..2]-(connected)
   → Enrich with relationships and connected entities
   │
   ▼
5. Context Building
   Combine: vector results + graph structure + entity properties
   → Structured context for LLM
   │
   ▼
6. LLM Generation (OpenAI GPT-4)
   System: "You are a biomedical knowledge assistant..."
   Context: [retrieved entities and relationships]
   User: "What drugs treat diabetes?"
   → Natural language answer with citations
   │
   ▼
7. Response Formatting
   {
     answer: "Several drugs treat diabetes...",
     sources: [{type: "Drug", name: "Metformin", ...}],
     graphData: {nodes: [...], relationships: [...]}
   }
```

---

## Components and Interfaces

### Backend Components

#### 1. Chat API Routes (`/api/chat`)

**Endpoints:**

```typescript
// Send a chat message
POST /api/chat/message
Request: {
  message: string;
  conversationId?: string;
  includeGraph?: boolean;
}
Response: {
  answer: string;
  sources: Source[];
  graphData?: GraphData;
  conversationId: string;
  queryType: 'semantic' | 'structural' | 'hybrid' | 'exact';
}

// Get conversation history
GET /api/chat/conversations/:conversationId
Response: {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

// Clear conversation
DELETE /api/chat/conversations/:conversationId
Response: {
  success: boolean;
}
```

#### 2. Hybrid Search Service

**Interface:**

```typescript
interface HybridSearchService {
  // Perform hybrid search combining vector and graph
  search(query: string, options: SearchOptions): Promise<SearchResult>;
  
  // Vector-only search
  vectorSearch(embedding: number[], entityType: EntityType, limit: number): Promise<VectorResult[]>;
  
  // Graph expansion from seed entities
  expandGraph(entityIds: string[], maxHops: number): Promise<GraphData>;
  
  // Rank and merge results
  rankResults(vectorResults: VectorResult[], graphResults: GraphData): Promise<RankedResult[]>;
}

interface SearchOptions {
  mode: 'semantic' | 'structural' | 'hybrid' | 'exact';
  entityTypes?: EntityType[];
  limit?: number;
  maxHops?: number;
}

interface SearchResult {
  entities: RankedEntity[];
  graphData: GraphData;
  queryType: string;
}

interface RankedEntity {
  id: string;
  type: EntityType;
  name: string;
  properties: Record<string, any>;
  relevanceScore: number;
  matchReason: string;
}
```

**Implementation Strategy:**

```typescript
class HybridSearchService {
  async search(query: string, options: SearchOptions): Promise<SearchResult> {
    // 1. Route query based on keywords
    const queryType = this.routeQuery(query, options.mode);
    
    // 2. Generate embedding for query
    const embedding = await this.embeddingService.embed(query);
    
    // 3. Perform vector search
    const vectorResults = await this.vectorSearch(
      embedding,
      options.entityTypes,
      options.limit || 10
    );
    
    // 4. Expand graph from top results
    const entityIds = vectorResults.map(r => r.id);
    const graphData = await this.expandGraph(entityIds, options.maxHops || 2);
    
    // 5. Rank combined results
    const rankedEntities = await this.rankResults(vectorResults, graphData);
    
    return {
      entities: rankedEntities,
      graphData,
      queryType
    };
  }
  
  private routeQuery(query: string, mode?: string): QueryType {
    if (mode) return mode;
    
    const lowerQuery = query.toLowerCase();
    
    // Semantic indicators
    if (lowerQuery.includes('similar') || lowerQuery.includes('like')) {
      return 'semantic';
    }
    
    // Structural indicators
    if (lowerQuery.includes('pathway') || lowerQuery.includes('mechanism')) {
      return 'structural';
    }
    
    // Exact match indicators
    if (lowerQuery.includes('list all') || lowerQuery.includes('show all')) {
      return 'exact';
    }
    
    // Default to hybrid
    return 'hybrid';
  }
}
```

#### 3. Embedding Service

**Interface:**

```typescript
interface EmbeddingService {
  // Generate embedding for text
  embed(text: string): Promise<number[]>;
  
  // Batch generate embeddings
  batchEmbed(texts: string[]): Promise<number[][]>;
  
  // Generate and store embeddings for all entities
  generateAllEmbeddings(entityType?: EntityType): Promise<EmbeddingStats>;
  
  // Update embedding for a single entity
  updateEntityEmbedding(entityId: string, entityType: EntityType): Promise<void>;
}

interface EmbeddingStats {
  total: number;
  processed: number;
  failed: number;
  cost: number;
}
```

**Composite Embedding Strategy:**

```typescript
class EmbeddingService {
  async generateEntityText(entity: any, type: EntityType): Promise<string> {
    switch (type) {
      case 'Drug':
        return `
Drug: ${entity.name}
Indication: ${entity.indication || 'N/A'}
Mechanism: ${entity.mechanism_of_action || 'N/A'}
Description: ${entity.description || 'N/A'}
Pharmacodynamics: ${entity.pharmacodynamics || 'N/A'}
        `.trim();
        
      case 'Disease':
      case 'ClinicalDisease':
        return `
Disease: ${entity.name}
Definition: ${entity.mondo_definition || entity.description || 'N/A'}
Symptoms: ${entity.mayo_symptoms || 'N/A'}
Clinical: ${entity.orphanet_clinical_description || 'N/A'}
Causes: ${entity.mayo_causes || 'N/A'}
        `.trim();
        
      case 'Protein':
        // Proteins have limited text, include relationships
        const relatedInfo = await this.getProteinRelationships(entity.id);
        return `
Protein: ${entity.name}
Synonyms: ${entity.synonyms?.join(', ') || 'N/A'}
Associated Diseases: ${relatedInfo.diseases.join(', ')}
Interacting Drugs: ${relatedInfo.drugs.join(', ')}
        `.trim();
        
      default:
        return entity.name || '';
    }
  }
  
  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text
      })
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

#### 4. Conversation Manager

**Interface:**

```typescript
interface ConversationManager {
  // Create new conversation
  createConversation(): Conversation;
  
  // Add message to conversation
  addMessage(conversationId: string, message: Message): Promise<void>;
  
  // Get conversation context
  getContext(conversationId: string): Promise<ConversationContext>;
  
  // Clear conversation
  clearConversation(conversationId: string): Promise<void>;
}

interface Conversation {
  id: string;
  messages: Message[];
  context: ConversationContext;
  createdAt: Date;
  updatedAt: Date;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  graphData?: GraphData;
}

interface ConversationContext {
  mentionedEntities: Set<string>;
  exploredRelationships: Set<string>;
  currentFocus?: EntityType;
  lastQuery?: string;
}
```

**Implementation:**

```typescript
class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();
  
  createConversation(): Conversation {
    const id = crypto.randomUUID();
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
    return conversation;
  }
  
  async addMessage(conversationId: string, message: Message): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    
    // Update context based on message
    if (message.sources) {
      message.sources.forEach(source => {
        conversation.context.mentionedEntities.add(source.nodeId);
      });
    }
  }
  
  async getContext(conversationId: string): Promise<ConversationContext> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    
    return conversation.context;
  }
}
```

#### 5. Response Generator

**Interface:**

```typescript
interface ResponseGenerator {
  // Generate natural language response
  generate(query: string, context: SearchResult, conversationContext?: ConversationContext): Promise<GeneratedResponse>;
}

interface GeneratedResponse {
  answer: string;
  sources: Source[];
  confidence: number;
}

interface Source {
  entityType: EntityType;
  entityName: string;
  nodeId: string;
  relevanceScore: number;
  excerpt: string;
  properties: Record<string, any>;
}
```

**Implementation:**

```typescript
class ResponseGenerator {
  async generate(
    query: string,
    searchResult: SearchResult,
    conversationContext?: ConversationContext
  ): Promise<GeneratedResponse> {
    // Build context for LLM
    const contextText = this.buildContextText(searchResult);
    
    // Build conversation history
    const conversationHistory = conversationContext 
      ? this.buildConversationHistory(conversationContext)
      : '';
    
    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: `Context:\n${contextText}\n\n${conversationHistory}\n\nQuestion: ${query}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    
    const data = await response.json();
    const answer = data.choices[0].message.content;
    
    // Extract sources
    const sources = this.extractSources(searchResult);
    
    return {
      answer,
      sources,
      confidence: this.calculateConfidence(searchResult)
    };
  }
  
  private getSystemPrompt(): string {
    return `You are a biomedical knowledge assistant. Your role is to answer questions about drugs, diseases, proteins, and their relationships based on the provided context.

Guidelines:
1. Answer concisely and accurately based on the context
2. Cite specific entities when making claims
3. If the context doesn't contain enough information, say so
4. Use scientific terminology appropriately
5. Format entity names in bold (e.g., **Aspirin**)
6. Keep answers under 200 words unless more detail is requested`;
  }
  
  private buildContextText(searchResult: SearchResult): string {
    let context = 'Relevant entities:\n\n';
    
    searchResult.entities.forEach((entity, index) => {
      context += `${index + 1}. ${entity.type}: ${entity.name}\n`;
      
      // Include key properties
      if (entity.type === 'Drug' && entity.properties.indication) {
        context += `   Indication: ${entity.properties.indication}\n`;
      }
      if (entity.type === 'Disease' && entity.properties.description) {
        context += `   Description: ${entity.properties.description}\n`;
      }
      
      context += '\n';
    });
    
    // Include relationships
    if (searchResult.graphData.relationships.length > 0) {
      context += '\nRelationships:\n';
      searchResult.graphData.relationships.forEach(rel => {
        const startNode = searchResult.graphData.nodes.find(n => n.id === rel.startNodeId);
        const endNode = searchResult.graphData.nodes.find(n => n.id === rel.endNodeId);
        
        if (startNode && endNode) {
          context += `- ${startNode.properties.name} -[${rel.type}]-> ${endNode.properties.name}\n`;
        }
      });
    }
    
    return context;
  }
}
```

### Frontend Components

#### 1. ChatInterface Component

**Component Structure:**

```typescript
interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  onEntityClick: (entityId: string, entityType: EntityType) => void;
  onShowInGraph: (graphData: GraphData) => void;
}

interface ChatInterfaceState {
  messages: ChatMessage[];
  inputValue: string;
  isLoading: boolean;
  conversationId: string;
  mode: 'docked' | 'floating' | 'minimized';
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Source[];
  graphData?: GraphData;
  entities?: EntityMention[];
}

interface EntityMention {
  text: string;
  type: EntityType;
  nodeId: string;
  startIndex: number;
  endIndex: number;
}
```

**Component Layout:**

```tsx
<div className="chat-interface" data-mode={mode}>
  <ChatHeader 
    onMinimize={handleMinimize}
    onClose={handleClose}
    onToggleMode={handleToggleMode}
  />
  
  <ChatMessages 
    messages={messages}
    onEntityClick={onEntityClick}
    onShowInGraph={onShowInGraph}
  />
  
  <ChatInput 
    value={inputValue}
    onChange={handleInputChange}
    onSubmit={handleSubmit}
    isLoading={isLoading}
  />
</div>
```

**CSS Structure:**

```css
.chat-interface {
  display: flex;
  flex-direction: column;
  background: var(--surface-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.chat-interface[data-mode="docked"] {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 400px;
  border-radius: 0;
}

.chat-interface[data-mode="floating"] {
  position: fixed;
  min-width: 300px;
  min-height: 400px;
  max-width: 600px;
  max-height: 80vh;
  resize: both;
  overflow: auto;
}

.chat-interface[data-mode="minimized"] {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
}
```

#### 2. ChatMessage Component

**Rendering Strategy:**

```typescript
const ChatMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
  // Parse message content for entity mentions
  const parsedContent = useMemo(() => {
    return parseEntityMentions(message.content, message.entities);
  }, [message.content, message.entities]);
  
  return (
    <div className={`chat-message chat-message--${message.role}`}>
      <div className="chat-message__content">
        <ReactMarkdown>{parsedContent}</ReactMarkdown>
      </div>
      
      {message.sources && message.sources.length > 0 && (
        <ChatSources sources={message.sources} />
      )}
      
      {message.graphData && (
        <ChatGraphPreview 
          graphData={message.graphData}
          onShowInGraph={() => onShowInGraph(message.graphData)}
        />
      )}
    </div>
  );
};
```

#### 3. Entity Highlighting

**Implementation:**

```typescript
function parseEntityMentions(content: string, entities?: EntityMention[]): string {
  if (!entities || entities.length === 0) {
    return content;
  }
  
  // Sort entities by start index (descending) to avoid index shifting
  const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = content;
  
  sortedEntities.forEach(entity => {
    const before = result.substring(0, entity.startIndex);
    const entityText = result.substring(entity.startIndex, entity.endIndex);
    const after = result.substring(entity.endIndex);
    
    // Create clickable link
    const link = `[**${entityText}**](#entity-${entity.nodeId})`;
    
    result = before + link + after;
  });
  
  return result;
}
```

#### 4. GraphCanvas Integration

**Modifications to Existing GraphCanvas:**

```typescript
interface GraphCanvasProps {
  // ... existing props
  chatHighlightedEntities?: Set<string>;
  onChatModeChange?: (mode: 'docked' | 'floating' | 'minimized') => void;
}

// Adjust viewport when chat is docked
useEffect(() => {
  if (chatMode === 'docked') {
    // Reduce canvas width by chat panel width
    const chatWidth = 400;
    setCanvasWidth(window.innerWidth - chatWidth);
  } else {
    setCanvasWidth(window.innerWidth);
  }
}, [chatMode]);

// Highlight entities mentioned in chat
useEffect(() => {
  if (chatHighlightedEntities) {
    nodes.forEach(node => {
      if (chatHighlightedEntities.has(node.id)) {
        node.highlighted = true;
      }
    });
  }
}, [chatHighlightedEntities, nodes]);
```

---

## Data Models

### Neo4j Vector Index Schema

```cypher
// Create vector index for Drug entities
CREATE VECTOR INDEX drug_embeddings IF NOT EXISTS
FOR (d:Drug)
ON d.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};

// Create vector index for Disease entities
CREATE VECTOR INDEX disease_embeddings IF NOT EXISTS
FOR (d:Disease)
ON d.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};

// Create vector index for ClinicalDisease entities
CREATE VECTOR INDEX clinical_disease_embeddings IF NOT EXISTS
FOR (cd:ClinicalDisease)
ON cd.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};

// Create vector index for Protein entities
CREATE VECTOR INDEX protein_embeddings IF NOT EXISTS
FOR (p:Protein)
ON p.embedding
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};
```

### Vector Search Query Pattern

```cypher
// Search for similar entities
CALL db.index.vector.queryNodes('drug_embeddings', 10, $queryVector)
YIELD node, score
RETURN node, score
ORDER BY score DESC
LIMIT 10;

// Hybrid search: Vector + Graph expansion
CALL db.index.vector.queryNodes('drug_embeddings', 10, $queryVector)
YIELD node AS drug, score
MATCH (drug)-[r*1..2]-(connected)
WHERE connected:Disease OR connected:Protein
RETURN drug, r, connected, score
ORDER BY score DESC
LIMIT 50;
```

### Conversation Storage

**In-Memory Storage (Initial Implementation):**

```typescript
interface ConversationStore {
  conversations: Map<string, Conversation>;
  maxConversations: number; // LRU eviction
  ttl: number; // Time-to-live in milliseconds
}
```

**Future: Database Storage:**

```cypher
// Store conversation in Neo4j (future enhancement)
CREATE (c:Conversation {
  id: $conversationId,
  createdAt: datetime(),
  updatedAt: datetime()
})

CREATE (m:Message {
  id: $messageId,
  role: $role,
  content: $content,
  timestamp: datetime()
})

CREATE (c)-[:HAS_MESSAGE]->(m)

// Link to mentioned entities
MATCH (e) WHERE e.id IN $mentionedEntityIds
CREATE (m)-[:MENTIONS]->(e)
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Embedding dimensionality consistency
*For any* natural language text input, the generated embedding vector should have exactly 1536 dimensions
**Validates: Requirements 1.1, 2.4**

### Property 2: Search results ordering
*For any* vector search query, the returned entities should be ordered by descending cosine similarity score
**Validates: Requirements 1.2**

### Property 3: Relevance score presence
*For any* search result entity, the entity should have a numeric relevance score between 0 and 1
**Validates: Requirements 1.3**

### Property 4: Drug embedding completeness
*For any* drug entity, the generated embedding text should contain the fields: name, indication, mechanism, description, and pharmacodynamics (or "N/A" for missing fields)
**Validates: Requirements 2.1**

### Property 5: Disease embedding completeness
*For any* disease entity, the generated embedding text should contain the fields: name, definition, symptoms, and clinical descriptions (or "N/A" for missing fields)
**Validates: Requirements 2.2**

### Property 6: Protein embedding completeness
*For any* protein entity, the generated embedding text should contain the fields: name, synonyms, and associated relationships
**Validates: Requirements 2.3**

### Property 7: Embedding regeneration on update
*For any* entity, if its properties are updated, the embedding should change to reflect the new content
**Validates: Requirements 2.5**

### Property 8: Response time constraint
*For any* chat message, the system should return a response within 3 seconds (excluding network latency)
**Validates: Requirements 3.1**

### Property 9: Source citation presence
*For any* generated response with relevant entities, the sources array should be non-empty
**Validates: Requirements 3.2**

### Property 10: Entity highlighting in responses
*For any* answer containing entity names, those names should be wrapped in clickable markdown links
**Validates: Requirements 3.3**

### Property 11: Multi-source synthesis
*For any* query with multiple relevant entities (>1), the response should reference multiple sources in the answer text
**Validates: Requirements 3.5**

### Property 12: Conversation ID uniqueness
*For any* new conversation, the generated ID should not match any existing conversation ID in the system
**Validates: Requirements 4.1**

### Property 13: Context retrieval for follow-ups
*For any* follow-up message in an existing conversation, the system should retrieve the conversation history before processing
**Validates: Requirements 4.2**

### Property 14: Reference resolution
*For any* message containing pronouns ("it", "that", "them") in a conversation with previous entity mentions, the system should resolve the reference to a specific entity
**Validates: Requirements 4.3**

### Property 15: Context retention
*For any* conversation with more than 10 messages, all messages should be retrievable from the conversation store
**Validates: Requirements 4.4**

### Property 16: Context isolation
*For any* new conversation, the conversation context should not contain entities from other conversations
**Validates: Requirements 4.5**

### Property 17: Entity click integration
*For any* entity mention click event, the graph visualization should update to display that entity
**Validates: Requirements 5.1**

### Property 18: Graph visualization option
*For any* response containing graph data, a "Show in Graph" button should be present in the UI
**Validates: Requirements 5.2**

### Property 19: Graph loading from chat
*For any* graph data, clicking "show in graph" should update the GraphCanvas with those nodes and relationships
**Validates: Requirements 5.3**

### Property 20: Conversation entity highlighting
*For any* entities in the current conversation context, those nodes in the graph should have a highlighted visual state
**Validates: Requirements 5.4**

### Property 21: Chat visibility persistence
*For any* graph update triggered from chat, the chat interface should remain in its current visibility state (open/minimized)
**Validates: Requirements 5.5**

### Property 22: Hybrid search pipeline order
*For any* hybrid search execution, vector search should complete before graph expansion begins
**Validates: Requirements 6.1**

### Property 23: Graph expansion from vector results
*For any* vector search results, the system should query for connected entities via graph traversal
**Validates: Requirements 6.2**

### Property 24: Traversal depth limit
*For any* seed entity in graph expansion, the expansion should include entities at distance 1 and 2, but not distance 3 or greater
**Validates: Requirements 6.3**

### Property 25: Composite ranking
*For any* combined vector and graph results, entities with both high similarity scores and high graph centrality should rank higher than entities with only one
**Validates: Requirements 6.4**

### Property 26: Context composition
*For any* answer generation, the context provided to the LLM should include both vector search results and graph relationships
**Validates: Requirements 6.5**

### Property 27: Source metadata completeness
*For any* source in a response, the source object should contain: entityType, entityName, nodeId, relevanceScore, and excerpt
**Validates: Requirements 7.1, 7.2**

### Property 28: Source click handling
*For any* source citation click event, the entity details panel should open with that entity's full data
**Validates: Requirements 7.3**

### Property 29: Source ordering
*For any* response with multiple sources, sources should be ordered by descending relevance score
**Validates: Requirements 7.4**

### Property 30: Excerpt relevance
*For any* source citation, the excerpt should contain property values that were used in generating the answer
**Validates: Requirements 7.5**

### Property 31: Vector index configuration
*For any* created vector index, the configuration should specify 1536 dimensions and cosine similarity function
**Validates: Requirements 8.2**

### Property 32: Vector search implementation
*For any* vector search operation, the Cypher query should use the db.index.vector.queryNodes function
**Validates: Requirements 8.3**

### Property 33: Vector search performance
*For any* vector search query against 25,000 entities, the query should complete in under 500 milliseconds
**Validates: Requirements 8.4**

### Property 34: Embedding storage format
*For any* entity with an embedding, the node should have an "embedding" property that is an array of numbers
**Validates: Requirements 8.5**

### Property 35: Chat mode state
*For any* opened chat interface, the mode should be either "docked" or "floating" (not "minimized")
**Validates: Requirements 9.2**

### Property 36: Drag boundary constraints
*For any* drag operation on the floating chat panel, the panel should remain within the viewport bounds
**Validates: Requirements 9.3**

### Property 37: Viewport adjustment for docked mode
*For any* docked chat panel, the GraphCanvas width should be reduced by the chat panel width
**Validates: Requirements 9.4**

### Property 38: Click-through in floating mode
*For any* click event outside the floating chat panel, the event should propagate to the GraphCanvas
**Validates: Requirements 9.5**

### Property 39: Resize constraints
*For any* resize operation on the chat panel, the resulting dimensions should not be less than 300x400 pixels
**Validates: Requirements 9.6**

### Property 40: Viewport restoration on minimize
*For any* minimize action, the GraphCanvas should return to full viewport width
**Validates: Requirements 9.7**

### Property 41: Semantic query routing
*For any* query containing "similar" or "like", the detected query type should be "semantic"
**Validates: Requirements 10.1**

### Property 42: Structural query routing
*For any* query containing "pathway" or "mechanism", the detected query type should be "structural"
**Validates: Requirements 10.2**

### Property 43: Exact query routing
*For any* query containing "list" or "all", the detected query type should be "exact"
**Validates: Requirements 10.3**

### Property 44: Default hybrid routing
*For any* query without specific routing keywords, the detected query type should be "hybrid"
**Validates: Requirements 10.4**

### Property 45: Query type logging
*For any* processed query, the system should log the detected query type
**Validates: Requirements 10.5**

### Property 46: Deterministic pipeline execution
*For any* query, the execution should follow exactly three steps in order: retrieve, expand, generate
**Validates: Requirements 11.1**

### Property 47: Single LLM call
*For any* response generation, there should be exactly one call to the OpenAI chat completion API
**Validates: Requirements 11.2**

### Property 48: No multi-step reasoning
*For any* query that returns no results, the system should respond immediately without additional API calls
**Validates: Requirements 11.3**

### Property 49: Predefined search strategies
*For any* query, the search strategy should be determined by keyword matching, not dynamic planning
**Validates: Requirements 11.4**

### Property 50: No LLM tool access
*For any* LLM API call, the function calling or tools parameter should be disabled or omitted
**Validates: Requirements 11.5**

---

## Error Handling

### Error Categories

1. **External API Errors**
   - OpenAI API failures (rate limits, timeouts, invalid responses)
   - Neo4j connection failures
   - Network errors

2. **Data Validation Errors**
   - Invalid embedding dimensions
   - Missing required entity properties
   - Malformed query inputs

3. **Search Errors**
   - No results found
   - Vector index not available
   - Graph traversal failures

4. **Conversation Errors**
   - Conversation not found
   - Context retrieval failures
   - Message storage failures

### Error Handling Strategies

**OpenAI API Errors:**

```typescript
async function callOpenAI(request: any): Promise<any> {
  const maxRetries = 3;
  const retryDelay = 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(openaiUrl, {
        method: 'POST',
        headers: { /* ... */ },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.status === 429) {
        // Rate limit - exponential backoff
        await sleep(retryDelay * Math.pow(2, attempt - 1));
        continue;
      }
      
      if (!response.ok) {
        throw new OpenAIError(response.status, await response.text());
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) {
        throw new ChatError(
          'OPENAI_ERROR',
          'Failed to generate response after multiple attempts',
          { originalError: error }
        );
      }
    }
  }
}
```

**No Results Found:**

```typescript
async function handleNoResults(query: string): Promise<ChatResponse> {
  return {
    answer: `I couldn't find any entities matching "${query}". Try:
- Using different keywords
- Checking spelling
- Asking about drugs, diseases, or proteins
- Being more specific (e.g., "diabetes drugs" instead of "diabetes")`,
    sources: [],
    conversationId: currentConversationId,
    queryType: 'none'
  };
}
```

**Vector Index Not Available:**

```typescript
async function ensureVectorIndexes(): Promise<void> {
  const requiredIndexes = [
    'drug_embeddings',
    'disease_embeddings',
    'protein_embeddings',
    'clinical_disease_embeddings'
  ];
  
  for (const indexName of requiredIndexes) {
    const exists = await checkIndexExists(indexName);
    if (!exists) {
      throw new ChatError(
        'VECTOR_INDEX_MISSING',
        `Vector index ${indexName} not found. Please run embedding generation first.`,
        { indexName }
      );
    }
  }
}
```

**Conversation Not Found:**

```typescript
async function getConversation(conversationId: string): Promise<Conversation> {
  const conversation = conversationStore.get(conversationId);
  
  if (!conversation) {
    // Create new conversation instead of erroring
    console.warn(`Conversation ${conversationId} not found, creating new one`);
    return conversationManager.createConversation();
  }
  
  return conversation;
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    type: string;
    message: string;
    details?: any;
    correlationId: string;
  };
}

// Example error responses
{
  error: {
    type: 'OPENAI_RATE_LIMIT',
    message: 'OpenAI API rate limit exceeded. Please try again in a moment.',
    correlationId: 'abc-123'
  }
}

{
  error: {
    type: 'NO_RESULTS',
    message: 'No entities found matching your query.',
    details: {
      query: 'xyzabc',
      suggestions: ['Try different keywords', 'Check spelling']
    },
    correlationId: 'def-456'
  }
}
```

---

## Testing Strategy

### Unit Testing

**Backend Services:**

```typescript
describe('EmbeddingService', () => {
  test('generates 1536-dimensional embeddings', async () => {
    const text = 'Test drug description';
    const embedding = await embeddingService.embed(text);
    expect(embedding).toHaveLength(1536);
    expect(embedding.every(n => typeof n === 'number')).toBe(true);
  });
  
  test('generates composite text for drugs', async () => {
    const drug = {
      name: 'Aspirin',
      indication: 'Pain relief',
      mechanism_of_action: 'COX inhibitor'
    };
    const text = await embeddingService.generateEntityText(drug, 'Drug');
    expect(text).toContain('Aspirin');
    expect(text).toContain('Pain relief');
    expect(text).toContain('COX inhibitor');
  });
});

describe('HybridSearchService', () => {
  test('routes semantic queries correctly', () => {
    const query = 'Find drugs similar to Aspirin';
    const type = searchService.routeQuery(query);
    expect(type).toBe('semantic');
  });
  
  test('performs vector search and returns ranked results', async () => {
    const query = 'diabetes treatment';
    const results = await searchService.search(query, { mode: 'semantic' });
    expect(results.entities.length).toBeGreaterThan(0);
    expect(results.entities[0].relevanceScore).toBeGreaterThanOrEqual(
      results.entities[results.entities.length - 1].relevanceScore
    );
  });
});

describe('ConversationManager', () => {
  test('creates unique conversation IDs', () => {
    const conv1 = conversationManager.createConversation();
    const conv2 = conversationManager.createConversation();
    expect(conv1.id).not.toBe(conv2.id);
  });
  
  test('maintains context across messages', async () => {
    const conv = conversationManager.createConversation();
    await conversationManager.addMessage(conv.id, {
      role: 'user',
      content: 'Tell me about Aspirin',
      timestamp: new Date()
    });
    
    const context = await conversationManager.getContext(conv.id);
    expect(context.mentionedEntities.size).toBeGreaterThan(0);
  });
});
```

**Frontend Components:**

```typescript
describe('ChatInterface', () => {
  test('renders messages correctly', () => {
    const messages = [
      { role: 'user', content: 'Hello', timestamp: new Date() },
      { role: 'assistant', content: 'Hi there!', timestamp: new Date() }
    ];
    
    render(<ChatInterface messages={messages} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });
  
  test('highlights entity mentions', () => {
    const message = {
      role: 'assistant',
      content: 'Aspirin is a drug',
      entities: [{
        text: 'Aspirin',
        type: 'Drug',
        nodeId: '123',
        startIndex: 0,
        endIndex: 7
      }]
    };
    
    render(<ChatMessage message={message} />);
    const link = screen.getByRole('link', { name: /Aspirin/i });
    expect(link).toBeInTheDocument();
  });
  
  test('adjusts viewport when docked', () => {
    const { rerender } = render(
      <App chatMode="minimized" />
    );
    
    const canvas = screen.getByTestId('graph-canvas');
    const initialWidth = canvas.style.width;
    
    rerender(<App chatMode="docked" />);
    const dockedWidth = canvas.style.width;
    
    expect(parseInt(dockedWidth)).toBeLessThan(parseInt(initialWidth));
  });
});
```

### Property-Based Testing

**Testing Framework:** fast-check (JavaScript/TypeScript property-based testing library)

**Configuration:** Each property test should run a minimum of 100 iterations

**Property Test Examples:**

```typescript
import fc from 'fast-check';

describe('Property Tests: Embedding Service', () => {
  test('Property 1: Embedding dimensionality consistency', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        async (text) => {
          const embedding = await embeddingService.embed(text);
          expect(embedding).toHaveLength(1536);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Property 4: Drug embedding completeness', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string(),
          indication: fc.option(fc.string()),
          mechanism_of_action: fc.option(fc.string()),
          description: fc.option(fc.string()),
          pharmacodynamics: fc.option(fc.string())
        }),
        async (drug) => {
          const text = await embeddingService.generateEntityText(drug, 'Drug');
          expect(text).toContain(drug.name);
          expect(text).toMatch(/Indication:/);
          expect(text).toMatch(/Mechanism:/);
          expect(text).toMatch(/Description:/);
          expect(text).toMatch(/Pharmacodynamics:/);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property Tests: Search Service', () => {
  test('Property 2: Search results ordering', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (query) => {
          const results = await searchService.search(query, { mode: 'semantic' });
          
          // Check that results are ordered by descending score
          for (let i = 0; i < results.entities.length - 1; i++) {
            expect(results.entities[i].relevanceScore).toBeGreaterThanOrEqual(
              results.entities[i + 1].relevanceScore
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Property 3: Relevance score presence', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (query) => {
          const results = await searchService.search(query, { mode: 'semantic' });
          
          results.entities.forEach(entity => {
            expect(typeof entity.relevanceScore).toBe('number');
            expect(entity.relevanceScore).toBeGreaterThanOrEqual(0);
            expect(entity.relevanceScore).toBeLessThanOrEqual(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property Tests: Conversation Manager', () => {
  test('Property 12: Conversation ID uniqueness', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 100 }),
        (numConversations) => {
          const ids = new Set<string>();
          
          for (let i = 0; i < numConversations; i++) {
            const conv = conversationManager.createConversation();
            expect(ids.has(conv.id)).toBe(false);
            ids.add(conv.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  test('Property 16: Context isolation', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 10 }),
        async (entityIds) => {
          // Create first conversation and add entities
          const conv1 = conversationManager.createConversation();
          entityIds.forEach(id => {
            conv1.context.mentionedEntities.add(id);
          });
          
          // Create second conversation
          const conv2 = conversationManager.createConversation();
          
          // Verify conv2 doesn't have conv1's entities
          entityIds.forEach(id => {
            expect(conv2.context.mentionedEntities.has(id)).toBe(false);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property Tests: UI Components', () => {
  test('Property 39: Resize constraints', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (width, height) => {
          const constrained = applyResizeConstraints(width, height);
          expect(constrained.width).toBeGreaterThanOrEqual(300);
          expect(constrained.height).toBeGreaterThanOrEqual(400);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Integration Testing

**End-to-End Chat Flow:**

```typescript
describe('Integration: Chat Flow', () => {
  test('complete chat interaction', async () => {
    // 1. User sends message
    const response = await request(app)
      .post('/api/chat/message')
      .send({ message: 'What drugs treat diabetes?' });
    
    expect(response.status).toBe(200);
    expect(response.body.answer).toBeTruthy();
    expect(response.body.sources.length).toBeGreaterThan(0);
    expect(response.body.conversationId).toBeTruthy();
    
    // 2. Follow-up message with context
    const followUp = await request(app)
      .post('/api/chat/message')
      .send({
        message: 'What are the side effects?',
        conversationId: response.body.conversationId
      });
    
    expect(followUp.status).toBe(200);
    expect(followUp.body.answer).toContain('side effect');
  });
  
  test('vector search to graph visualization', async () => {
    // 1. Perform search
    const searchResponse = await request(app)
      .post('/api/chat/message')
      .send({
        message: 'Find drugs similar to Aspirin',
        includeGraph: true
      });
    
    expect(searchResponse.body.graphData).toBeTruthy();
    expect(searchResponse.body.graphData.nodes.length).toBeGreaterThan(0);
    
    // 2. Verify graph data structure
    const graphData = searchResponse.body.graphData;
    graphData.nodes.forEach(node => {
      expect(node.id).toBeTruthy();
      expect(node.labels).toBeInstanceOf(Array);
      expect(node.properties).toBeTruthy();
    });
  });
});
```

### Performance Testing

**Benchmarks:**

```typescript
describe('Performance Tests', () => {
  test('vector search completes in <500ms', async () => {
    const start = Date.now();
    await searchService.vectorSearch(testEmbedding, 'Drug', 10);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
  
  test('chat response completes in <3s', async () => {
    const start = Date.now();
    await request(app)
      .post('/api/chat/message')
      .send({ message: 'What treats diabetes?' });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });
  
  test('embedding generation batch performance', async () => {
    const texts = Array(100).fill('Test text');
    const start = Date.now();
    await embeddingService.batchEmbed(texts);
    const duration = Date.now() - start;
    
    // Should process ~100 texts in reasonable time
    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

---

## Implementation Notes

### Technology Stack Summary

**Backend:**
- Node.js 18+ with TypeScript
- Express.js for REST API
- Neo4j Driver 6.0+ for database access
- OpenAI SDK for embeddings and chat
- fast-check for property-based testing

**Frontend:**
- React 18+ with TypeScript
- react-draggable for floating panel
- react-markdown for message rendering
- prism-react-renderer for syntax highlighting

**Database:**
- Neo4j 5.26+ (required for vector indexes)

### Cost Estimates

**One-Time Costs:**
- Embedding generation: ~$0.23 (23,453 entities × 500 tokens × $0.02/1M tokens)

**Ongoing Costs (monthly):**
- Chat completions: $10-50 (depends on usage, ~1000-5000 queries/month)
- Embedding updates: $1-5 (incremental updates)
- Infrastructure: $0 (using existing Neo4j instance)

**Total: $11-55/month**

### Deployment Considerations

1. **Neo4j Version Check:** Verify Neo4j is 5.26+ before deployment
2. **Embedding Generation:** Run initial embedding generation as a one-time migration
3. **API Keys:** Ensure OpenAI API key is configured in backend environment
4. **Rate Limiting:** Configure appropriate rate limits for chat endpoint
5. **Monitoring:** Add logging for query types, response times, and error rates

### Future Enhancements

1. **Conversation Persistence:** Move from in-memory to Neo4j storage
2. **Advanced Ranking:** Incorporate user feedback to improve result ranking
3. **Multi-Modal Input:** Support image upload for drug structures
4. **Query Suggestions:** Provide auto-complete suggestions based on popular queries
5. **Export Functionality:** Allow users to export conversations as PDF/Markdown
6. **Collaborative Features:** Share conversations between users
7. **Analytics Dashboard:** Track popular queries, entity mentions, and usage patterns
