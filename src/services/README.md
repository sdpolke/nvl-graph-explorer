# Services

This directory contains service classes for interacting with external systems.

## OpenAIService

The `OpenAIService` handles conversion of natural language queries to Cypher queries using the OpenAI API.

### Configuration

Set the OpenAI API key in your `.env` file:

```bash
VITE_OPENAI_API_KEY=your-api-key-here
```

### Usage

```typescript
import { openAIService } from './services';

// Convert natural language to Cypher
const cypherQuery = await openAIService.generateCypherQuery(
  "Show me genes related to cancer"
);
// Returns: MATCH (g:Gene)-[r:ASSOCIATED_WITH]->(d:Disease) WHERE toLower(d.name) CONTAINS 'cancer' RETURN g, r, d LIMIT 50
```

### Error Handling

The service throws `AppError` objects with type `GPT_ERROR` for various failure scenarios:

- **API_KEY_MISSING**: OpenAI API key not configured
- **EMPTY_QUERY**: Query string is empty
- **API_ERROR**: OpenAI API returned an error (401, 429, 500, etc.)
- **NETWORK_ERROR**: Network connectivity issues
- **EMPTY_RESPONSE**: OpenAI returned no response
- **INVALID_RESPONSE**: Could not extract valid Cypher from response
- **UNKNOWN_ERROR**: Unexpected errors

### Schema Context

The service includes a comprehensive schema context that describes:

- 40+ node types (Gene, Protein, Disease, Drug, etc.)
- 50+ relationship types (ENCODES, INTERACTS_WITH, TREATS, etc.)
- Query patterns and examples
- Best practices for graph visualization queries

### Features

- **Intelligent Query Extraction**: Removes markdown formatting and explanatory text
- **User-Friendly Error Messages**: Translates API errors to actionable messages
- **Validation**: Basic validation of generated Cypher queries
- **Configurable**: Supports custom API keys, models, and parameters

## Neo4jService

The `Neo4jService` handles all interactions with the Neo4j database.

### Configuration

Set Neo4j connection parameters in your `.env` file:

```bash
VITE_NEO4J_URI=neo4j://172.52.50.179:7687
VITE_NEO4J_USER=neo4j
VITE_NEO4J_PASSWORD=password
```

### Usage

```typescript
import { neo4jService } from './services';

// Execute a Cypher query
const data = await neo4jService.executeQuery(
  'MATCH (n:Gene) RETURN n LIMIT 10'
);

// Expand a node to show connected nodes
const expandedData = await neo4jService.expandNode(nodeId);
```
