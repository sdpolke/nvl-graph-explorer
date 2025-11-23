# Implementation Plan

- [x] 1. Set up vector database infrastructure
  - Create Neo4j vector indexes for all entity types (Drug, Disease, ClinicalDisease, Protein)
  - Verify Neo4j version is 5.26+ and vector index support is available
  - Test vector index creation and basic queries
  - _Requirements: 8.1, 8.2_

- [x] 2. Implement embedding generation service
- [x] 2.1 Create EmbeddingService class with OpenAI integration
  - Implement embed() method for single text embedding
  - Implement batchEmbed() method for batch processing
  - Add error handling and retry logic for API failures
  - _Requirements: 1.1, 2.4_

- [x] 2.2 Write property test for embedding dimensionality
  - **Property 1: Embedding dimensionality consistency**
  - **Validates: Requirements 1.1, 2.4**

- [x] 2.3 Implement composite text generation for entities
  - Create generateEntityText() method with entity type routing
  - Implement drug text generation (name, indication, mechanism, description, pharmacodynamics)
  - Implement disease text generation (name, definition, symptoms, clinical descriptions)
  - Implement protein text generation (name, synonyms, relationships)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.4 Write property tests for embedding completeness
  - **Property 4: Drug embedding completeness**
  - **Property 5: Disease embedding completeness**
  - **Property 6: Protein embedding completeness**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2.5 Create batch embedding generation script
  - Implement generateAllEmbeddings() method with progress tracking
  - Add batch processing with rate limiting
  - Store embeddings as node properties in Neo4j
  - Calculate and log cost estimates
  - _Requirements: 2.4, 8.5_

- [x] 2.6 Write property test for embedding storage format
  - **Property 34: Embedding storage format**
  - **Validates: Requirements 8.5**

- [x] 3. Implement hybrid search service
- [x] 3.1 Create HybridSearchService class
  - Implement query routing logic (semantic, structural, exact, hybrid)
  - Create vectorSearch() method using Neo4j vector indexes
  - Create expandGraph() method for graph traversal
  - Implement rankResults() method for composite scoring
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 10.1, 10.2, 10.3, 10.4_

- [x] 3.2 Write property tests for search functionality
  - **Property 2: Search results ordering**
  - **Property 3: Relevance score presence**
  - **Property 22: Hybrid search pipeline order**
  - **Property 24: Traversal depth limit**
  - **Property 41-44: Query routing**
  - **Validates: Requirements 1.2, 1.3, 6.1, 6.3, 10.1-10.4**

- [x] 3.3 Implement vector search with Neo4j
  - Write Cypher queries using db.index.vector.queryNodes
  - Add support for filtering by entity type
  - Implement result transformation to RankedEntity format
  - _Requirements: 1.2, 8.3_

- [x] 3.4 Write property tests for vector search
  - **Property 32: Vector search implementation**
  - **Property 33: Vector search performance**
  - **Validates: Requirements 8.3, 8.4**

- [x] 3.5 Implement graph expansion logic
  - Create Cypher queries for 1-2 hop traversal
  - Filter connected entities by relevance
  - Merge vector and graph results
  - _Requirements: 6.2, 6.3_

- [x] 3.6 Write property tests for graph expansion
  - **Property 23: Graph expansion from vector results**
  - **Property 26: Context composition**
  - **Validates: Requirements 6.2, 6.5**

- [x] 4. Implement conversation management
- [x] 4.1 Create ConversationManager class
  - Implement in-memory conversation storage with Map
  - Create createConversation() method with UUID generation
  - Implement addMessage() method with context tracking
  - Create getContext() method for context retrieval
  - Add LRU eviction for memory management
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 4.2 Write property tests for conversation management
  - **Property 12: Conversation ID uniqueness**
  - **Property 13: Context retrieval for follow-ups**
  - **Property 15: Context retention**
  - **Property 16: Context isolation**
  - **Validates: Requirements 4.1, 4.2, 4.4, 4.5**

- [x] 4.3 Implement context tracking
  - Track mentioned entities in conversation
  - Track explored relationships
  - Maintain current focus (entity type)
  - Store last query for reference resolution
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 4.4 Write property test for reference resolution
  - **Property 14: Reference resolution**
  - **Validates: Requirements 4.3**

- [x] 5. Implement response generation service
- [x] 5.1 Create ResponseGenerator class
  - Implement generate() method with OpenAI integration
  - Build context text from search results
  - Create system prompt for biomedical assistant
  - Format entity mentions for highlighting
  - Extract and format source citations
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 5.2 Write property tests for response generation
  - **Property 8: Response time constraint**
  - **Property 9: Source citation presence**
  - **Property 10: Entity highlighting in responses**
  - **Property 11: Multi-source synthesis**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

- [x] 5.3 Implement source extraction and formatting
  - Create extractSources() method from search results
  - Format source objects with all required metadata
  - Generate relevant excerpts from entity properties
  - Rank sources by relevance score
  - _Requirements: 7.1, 7.2, 7.4, 7.5_

- [x] 5.4 Write property tests for source handling
  - **Property 27: Source metadata completeness**
  - **Property 29: Source ordering**
  - **Property 30: Excerpt relevance**
  - **Validates: Requirements 7.1, 7.2, 7.4, 7.5**

- [x] 5.5 Implement RAG pipeline enforcement
  - Ensure single LLM call per query
  - Disable function calling in OpenAI requests
  - Implement deterministic three-step execution
  - Add query type logging
  - _Requirements: 11.1, 11.2, 11.5, 10.5_

- [x] 5.6 Write property tests for RAG constraints
  - **Property 45: Query type logging**
  - **Property 46: Deterministic pipeline execution**
  - **Property 47: Single LLM call**
  - **Property 50: No LLM tool access**
  - **Validates: Requirements 10.5, 11.1, 11.2, 11.5**

- [x] 6. Create backend API routes
- [x] 6.1 Implement /api/chat/message endpoint
  - Create POST handler for chat messages
  - Integrate HybridSearchService for retrieval
  - Integrate ResponseGenerator for answer generation
  - Integrate ConversationManager for context
  - Add request validation and error handling
  - _Requirements: 3.1, 3.2, 4.1, 4.2_

- [x] 6.2 Write integration tests for chat endpoint
  - Test complete chat flow (message → response)
  - Test follow-up messages with context
  - Test error handling (no results, API failures)
  - Test response format validation

- [x] 6.3 Implement /api/chat/conversations/:id endpoint
  - Create GET handler for conversation retrieval
  - Create DELETE handler for conversation clearing
  - Add conversation not found handling
  - _Requirements: 4.1, 4.5_

- [x] 6.4 Add error handling middleware
  - Handle OpenAI API errors with retry logic
  - Handle Neo4j connection failures
  - Handle no results found gracefully
  - Return structured error responses
  - _Requirements: 3.4, 11.3_

- [x] 6.5 Write property test for error handling
  - **Property 48: No multi-step reasoning**
  - **Validates: Requirements 11.3**

- [x] 7. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement ChatInterface component
- [x] 8.1 Create ChatInterface component structure
  - Set up component state (messages, mode, position, size)
  - Implement mode switching (docked, floating, minimized)
  - Add drag and resize handlers for floating mode
  - Create ChatHeader, ChatMessages, and ChatInput subcomponents
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 8.2 Write property tests for chat UI modes
  - **Property 35: Chat mode state**
  - **Property 36: Drag boundary constraints**
  - **Property 39: Resize constraints**
  - **Validates: Requirements 9.2, 9.3, 9.6**

- [x] 8.3 Implement ChatMessages component
  - Render message list with role-based styling
  - Parse and highlight entity mentions
  - Render source citations with metadata
  - Add "Show in Graph" button for graph data
  - Implement auto-scroll to latest message
  - _Requirements: 3.2, 3.3, 5.2_

- [x] 8.4 Write property test for entity highlighting
  - **Property 10: Entity highlighting in responses**
  - **Validates: Requirements 3.3**

- [x] 8.5 Implement ChatInput component
  - Create text input with submit button
  - Add loading state during API calls
  - Handle Enter key for submission
  - Clear input after successful send
  - _Requirements: 3.1_

- [x] 8.6 Add CSS styling for chat interface
  - Style docked mode (fixed right panel)
  - Style floating mode (draggable, resizable)
  - Style minimized mode (small button)
  - Add responsive design for different screen sizes
  - Ensure accessibility (focus states, ARIA labels)
  - _Requirements: 9.1, 9.2, 9.4, 9.6, 9.7_

- [x] 9. Implement GraphCanvas integration
- [x] 9.1 Modify GraphCanvas for chat integration
  - Add chatMode prop to track chat state
  - Adjust viewport width when chat is docked
  - Restore full width when chat is minimized
  - Add chatHighlightedEntities prop for highlighting
  - _Requirements: 9.4, 9.7, 5.4_

- [x] 9.2 Write property tests for viewport adjustment
  - **Property 37: Viewport adjustment for docked mode**
  - **Property 40: Viewport restoration on minimize**
  - **Validates: Requirements 9.4, 9.7**

- [x] 9.3 Implement entity click handling
  - Add onEntityClick handler to ChatInterface
  - Pass clicked entity to GraphCanvas
  - Load entity and neighbors into graph view
  - Highlight entity in graph visualization
  - _Requirements: 5.1, 7.3_

- [x] 9.4 Write property tests for entity interactions
  - **Property 17: Entity click integration**
  - **Property 18: Graph visualization option**
  - **Property 19: Graph loading from chat**
  - **Property 20: Conversation entity highlighting**
  - **Property 28: Source click handling**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 7.3**

- [x] 9.5 Implement "Show in Graph" functionality
  - Add onShowInGraph handler to ChatInterface
  - Load graph data into GraphCanvas
  - Maintain chat visibility during graph updates
  - _Requirements: 5.2, 5.3, 5.5_

- [x] 9.6 Write property tests for graph integration
  - **Property 21: Chat visibility persistence**
  - **Property 38: Click-through in floating mode**
  - **Validates: Requirements 5.5, 9.5**

- [x] 10. Implement chat API client service
- [x] 10.1 Create ChatService class in frontend
  - Implement sendMessage() method with fetch
  - Implement getConversation() method
  - Implement clearConversation() method
  - Add error handling and retry logic
  - Store conversation ID in component state
  - _Requirements: 3.1, 4.1_

- [x] 10.2 Write integration tests for chat service
  - Test message sending and response parsing
  - Test conversation retrieval
  - Test error handling
  - Test conversation ID persistence

- [x] 10.3 Integrate ChatService with ChatInterface
  - Call sendMessage() on user input
  - Update messages state with response
  - Handle loading states
  - Display error messages to user
  - _Requirements: 3.1, 3.4_

- [x] 11. Add entity mention parsing
- [x] 11.1 Implement parseEntityMentions function
  - Detect entity names in response text
  - Create EntityMention objects with positions
  - Convert entity mentions to clickable markdown links
  - Handle overlapping mentions
  - _Requirements: 3.3_

- [x] 11.2 Write property test for entity parsing
  - **Property 10: Entity highlighting in responses**
  - **Validates: Requirements 3.3**

- [x] 11.3 Integrate entity parsing with ChatMessage
  - Parse message content before rendering
  - Render markdown with react-markdown
  - Add click handlers to entity links
  - _Requirements: 3.3, 5.1_

- [x] 12. Implement source citation UI
- [x] 12.1 Create ChatSources component
  - Display list of sources with metadata
  - Show entity type, name, and relevance score
  - Render excerpt text
  - Add click handler for full details
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 12.2 Write property test for source display
  - **Property 27: Source metadata completeness**
  - **Validates: Requirements 7.1, 7.2**

- [x] 12.3 Integrate ChatSources with ChatMessage
  - Render sources below message content
  - Style sources with collapsible sections
  - Add "View in Graph" link for each source
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 13. Add chat toggle button to main UI
- [x] 13.1 Create ChatToggleButton component
  - Position button in bottom-right corner
  - Show unread message indicator
  - Add open/close animation
  - Integrate with App component state
  - _Requirements: 9.1_

- [x] 13.2 Integrate chat toggle with App component
  - Add chatOpen state to App
  - Pass state to ChatInterface and GraphCanvas
  - Handle mode changes (docked/floating/minimized)
  - Persist chat state in localStorage
  - _Requirements: 9.1, 9.2_

- [x] 14. Implement embedding generation migration
- [x] 14.1 Create migration script for initial embeddings
  - Query all entities by type from Neo4j
  - Generate embeddings in batches of 100
  - Store embeddings back to Neo4j
  - Log progress and cost estimates
  - Handle failures and resume capability
  - _Requirements: 2.4, 2.5, 8.5_

- [x] 14.2 Run embedding generation for all entity types
  - Generate embeddings for Drug entities (7,957)
  - Generate embeddings for Disease entities (10,791)
  - Generate embeddings for ClinicalDisease entities (23,551)
  - Generate embeddings for Protein entities (sample or all)
  - Verify all embeddings are stored correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 15. Add configuration and environment variables
- [ ] 15.1 Update backend environment configuration
  - Add OPENAI_API_KEY to .env
  - Add CHAT_ENABLED flag
  - Add EMBEDDING_MODEL configuration
  - Add CHAT_MODEL configuration
  - Update env.ts to load new variables
  - _Requirements: 1.1, 3.1_

- [ ] 15.2 Update frontend environment configuration
  - Add VITE_CHAT_ENABLED flag
  - Add VITE_BACKEND_URL for chat API
  - Update env.ts to load new variables
  - _Requirements: 3.1_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Add documentation
- [ ] 17.1 Create API documentation for chat endpoints
  - Document /api/chat/message request/response format
  - Document /api/chat/conversations/:id endpoints
  - Add example requests and responses
  - Document error codes and messages

- [ ] 17.2 Create user guide for chat interface
  - Document how to open/close chat
  - Explain query types and routing
  - Show example queries
  - Explain entity clicking and graph integration

- [ ] 17.3 Create developer guide for embeddings
  - Document embedding generation process
  - Explain how to update embeddings
  - Document vector index maintenance
  - Add troubleshooting guide

- [ ] 18. Final integration testing
- [ ] 18.1 Test complete user workflows
  - Test: Open chat → Ask question → View sources → Click entity → See in graph
  - Test: Multi-turn conversation with context
  - Test: Different query types (semantic, structural, hybrid)
  - Test: Error scenarios (no results, API failures)
  - Test: Chat modes (docked, floating, minimized)

- [ ] 18.2 Test performance benchmarks
  - Verify vector search < 500ms
  - Verify chat response < 3s
  - Verify embedding generation batch performance
  - Test with realistic data volumes

- [ ] 18.3 Test accessibility
  - Verify keyboard navigation works
  - Test screen reader compatibility
  - Verify focus management
  - Test color contrast ratios

- [ ] 19. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.
