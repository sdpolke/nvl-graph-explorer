# Requirements Document

## Introduction

This document specifies the requirements for implementing a hybrid semantic search system with an interactive chat interface for the biomedical knowledge graph explorer. The system will combine vector embeddings with graph structure to enable intelligent question answering through natural language queries.

## Glossary

- **Vector Embedding**: A numerical representation of text in high-dimensional space that captures semantic meaning
- **Hybrid Search**: A search approach combining vector similarity (semantic) with graph traversal (structural)
- **RAG (Retrieval-Augmented Generation)**: A pattern where relevant information is retrieved from a database and provided to an LLM for answer generation
- **Chat Interface**: A conversational UI component allowing users to interact with the system through natural language
- **Entity**: A node in the knowledge graph (Drug, Disease, Protein, ClinicalDisease)
- **Conversation Context**: The history and state maintained across multiple chat messages
- **Source Citation**: References to specific entities and data used to generate an answer
- **Graph Expansion**: The process of traversing relationships from retrieved entities to enrich context

## Requirements

### Requirement 1

**User Story:** As a researcher, I want to search for biomedical entities using natural language questions, so that I can find relevant information without knowing exact entity names or query syntax.

#### Acceptance Criteria

1. WHEN a user submits a natural language question THEN the system SHALL convert the question into a vector embedding
2. WHEN the system performs semantic search THEN the system SHALL return entities ranked by semantic similarity to the query
3. WHEN semantic search results are returned THEN the system SHALL include a relevance score for each entity
4. WHEN the user searches for "drugs similar to Aspirin" THEN the system SHALL return drugs with similar mechanisms or indications
5. WHEN the user asks "what treats diabetes" THEN the system SHALL return relevant drugs and their relationships to diabetes

### Requirement 2

**User Story:** As a researcher, I want the system to generate embeddings for all entities with rich semantic content, so that semantic search can find relevant information across the knowledge graph.

#### Acceptance Criteria

1. WHEN generating embeddings for drugs THEN the system SHALL include name, indication, mechanism, description, and pharmacodynamics in the embedding text
2. WHEN generating embeddings for diseases THEN the system SHALL include name, definition, symptoms, and clinical descriptions in the embedding text
3. WHEN generating embeddings for proteins THEN the system SHALL include name, synonyms, and associated relationships in the embedding text
4. WHEN storing embeddings THEN the system SHALL use 1536-dimensional vectors from OpenAI text-embedding-3-small model
5. WHEN an entity is updated THEN the system SHALL regenerate its embedding to maintain consistency

### Requirement 3

**User Story:** As a researcher, I want to interact with the knowledge graph through a chat interface, so that I can ask questions and receive natural language answers with supporting evidence.

#### Acceptance Criteria

1. WHEN a user sends a chat message THEN the system SHALL process the message and return a natural language response within 3 seconds
2. WHEN generating a response THEN the system SHALL include citations to source entities used in the answer
3. WHEN displaying an answer THEN the system SHALL highlight entity names that can be clicked to view in the graph
4. WHEN the system cannot answer a question THEN the system SHALL provide a helpful message explaining the limitation
5. WHEN multiple relevant entities exist THEN the system SHALL synthesize information from all relevant sources

### Requirement 4

**User Story:** As a researcher, I want the system to maintain conversation context across multiple messages, so that I can ask follow-up questions without repeating information.

#### Acceptance Criteria

1. WHEN a user starts a conversation THEN the system SHALL create a unique conversation identifier
2. WHEN a user sends a follow-up message THEN the system SHALL access the conversation history to understand context
3. WHEN the user refers to a previously mentioned entity THEN the system SHALL resolve the reference using conversation context
4. WHEN a conversation exceeds 10 messages THEN the system SHALL maintain context for all messages in the session
5. WHEN a user starts a new conversation THEN the system SHALL clear previous conversation context

### Requirement 5

**User Story:** As a researcher, I want the chat interface to integrate with the existing graph visualization, so that I can seamlessly explore entities mentioned in chat responses.

#### Acceptance Criteria

1. WHEN a user clicks an entity mention in a chat message THEN the system SHALL display that entity in the graph visualization
2. WHEN the system generates a response with graph data THEN the system SHALL provide an option to visualize the subgraph
3. WHEN the user requests "show in graph" THEN the system SHALL load the relevant entities and relationships into the graph view
4. WHEN displaying entities in the graph THEN the system SHALL highlight entities mentioned in the current conversation
5. WHEN the graph view is updated from chat THEN the system SHALL maintain the chat interface visibility

### Requirement 6

**User Story:** As a researcher, I want the system to use hybrid search combining semantic similarity and graph structure, so that I receive comprehensive and contextually rich answers.

#### Acceptance Criteria

1. WHEN performing hybrid search THEN the system SHALL first retrieve semantically similar entities using vector search
2. WHEN vector search returns results THEN the system SHALL expand the results by traversing graph relationships
3. WHEN expanding graph context THEN the system SHALL include directly connected entities up to 2 hops away
4. WHEN combining vector and graph results THEN the system SHALL rank entities by a composite score of semantic similarity and graph centrality
5. WHEN generating an answer THEN the system SHALL use both semantic matches and graph relationships as context

### Requirement 7

**User Story:** As a researcher, I want to see source citations for all chat responses, so that I can verify information and explore the underlying data.

#### Acceptance Criteria

1. WHEN the system generates an answer THEN the system SHALL include a list of source entities with relevance scores
2. WHEN displaying a source citation THEN the system SHALL show the entity type, name, and relevant excerpt
3. WHEN a user clicks a source citation THEN the system SHALL display the full entity details
4. WHEN multiple sources contribute to an answer THEN the system SHALL rank sources by relevance to the query
5. WHEN a source is cited THEN the system SHALL include the specific property values used in generating the answer

### Requirement 8

**User Story:** As a system administrator, I want to store vector embeddings efficiently in Neo4j, so that the system can perform fast semantic searches without external dependencies.

#### Acceptance Criteria

1. WHEN creating vector indexes THEN the system SHALL use Neo4j vector index functionality for each entity type
2. WHEN configuring vector indexes THEN the system SHALL set dimensionality to 1536 and similarity function to cosine
3. WHEN performing vector search THEN the system SHALL query the Neo4j vector index directly
4. WHEN vector search executes THEN the system SHALL return results in under 500 milliseconds for queries against 25,000 entities
5. WHEN storing embeddings THEN the system SHALL store the embedding array as a property on each entity node

### Requirement 9

**User Story:** As a researcher, I want a floating chat interface that doesn't obstruct the graph view, so that I can interact with both the chat and visualization simultaneously.

#### Acceptance Criteria

1. WHEN the chat interface is minimized THEN the system SHALL display only a small button that does not overlap with GraphCanvas interactive areas
2. WHEN the chat interface is opened THEN the system SHALL display it as a docked panel on the right side or as a draggable floating panel
3. WHEN the user drags the chat panel THEN the system SHALL allow positioning anywhere while preventing overlap with critical UI controls
4. WHEN the chat panel is docked THEN the system SHALL resize the GraphCanvas viewport to prevent occlusion
5. WHEN the chat panel is floating THEN the system SHALL allow GraphCanvas interactions to pass through to the canvas when clicking outside the chat panel
6. WHEN the user resizes the chat panel THEN the system SHALL maintain readability with minimum dimensions of 300x400 pixels
7. WHEN the user minimizes the chat THEN the system SHALL restore the GraphCanvas to full viewport size

### Requirement 10

**User Story:** As a researcher, I want the system to handle various query types intelligently, so that I receive appropriate responses regardless of how I phrase my questions.

#### Acceptance Criteria

1. WHEN a query contains "similar" or "like" THEN the system SHALL prioritize semantic similarity search
2. WHEN a query contains "pathway" or "mechanism" THEN the system SHALL prioritize graph traversal
3. WHEN a query contains "list" or "all" THEN the system SHALL execute a comprehensive Cypher query
4. WHEN a query is ambiguous THEN the system SHALL use hybrid search combining all approaches
5. WHEN the system routes a query THEN the system SHALL log the detected query type for analytics

### Requirement 11

**User Story:** As a system architect, I want the chat system to use a simple RAG pattern without agentic complexity, so that the system is maintainable, predictable, and cost-effective.

#### Acceptance Criteria

1. WHEN processing a query THEN the system SHALL follow a deterministic three-step pipeline: retrieve, expand, generate
2. WHEN generating responses THEN the system SHALL make a single LLM call with all retrieved context
3. WHEN the system cannot answer a query THEN the system SHALL respond directly without attempting multi-step reasoning or tool use
4. WHEN retrieving information THEN the system SHALL use predefined search strategies without dynamic planning
5. WHEN the LLM generates a response THEN the system SHALL not allow the LLM to execute additional queries or tools
