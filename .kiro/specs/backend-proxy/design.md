# Backend Proxy - Design Document

## Overview

The Backend Proxy is a lightweight Express.js server that acts as a secure intermediary between the frontend application and external services (Neo4j and OpenAI). It solves the critical security issue of exposing credentials in the browser by moving all authentication to the server side. The proxy maintains a minimal footprint with no business logic, simply forwarding requests and responses while adding security layers like rate limiting and request validation.

This design preserves the existing frontend architecture with minimal changes, requiring only updates to the service layer to point to proxy endpoints instead of direct connections.

## Architecture

### System Architecture

```
┌─────────────────┐
│  Browser        │
│  (Frontend)     │
│  React + Vite   │
└────────┬────────┘
         │ HTTP/HTTPS
         │
┌────────▼────────┐
│  Proxy Server   │
│  Express.js     │
│  Port: 3001     │
└────┬───────┬────┘
     │       │
     │       └──────────────┐
     │                      │
┌────▼─────────┐   ┌───────▼────────┐
│  Neo4j       │   │  OpenAI API    │
│  Database    │   │  (External)    │
└──────────────┘   └────────────────┘
```

### Request Flow

**Neo4j Query Flow:**
1. Frontend calls `neo4jService.executeQuery(cypher, params)`
2. Service sends POST to `/api/neo4j/query` with `{ cypher, params }`
3. Proxy validates request and rate limit
4. Proxy executes query against Neo4j using server-side credentials
5. Proxy transforms Neo4j result to JSON
6. Proxy returns result to frontend
7. Service processes result as before

**OpenAI Query Flow:**
1. Frontend calls `openAIService.generateCypherQuery(query)`
2. Service sends POST to `/api/openai/generate` with `{ query, schema }`
3. Proxy validates request and rate limit
4. Proxy calls OpenAI API with server-side API key
5. Proxy returns generated Cypher query
6. Service processes response as before

### Technology Stack

**Backend:**
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x (minimal, widely used, stable)
- **Neo4j Driver**: neo4j-driver (same as frontend)
- **Rate Limiting**: express-rate-limit
- **CORS**: cors middleware
- **Environment**: dotenv for configuration

**Why Express.js?**
- Minimal overhead (~200KB)
- Mature ecosystem
- Simple to deploy
- Easy to understand and maintain
- Excellent TypeScript support

## Components and Interfaces

### 1. Server Entry Point (server.ts)

**Purpose:** Initialize and configure the Express server with all middleware and routes.

**Responsibilities:**
- Load environment variables
- Configure middleware (CORS, JSON parsing, rate limiting)
- Register route handlers
- Start HTTP server
- Handle graceful shutdown

**Configuration:**
```typescript
interface ServerConfig {
  port: number;                    // Default: 3001
  corsOrigins: string[];           // Allowed origins
  neo4j: {
    uri: string;
    username: string;
    password: string;
    maxConnectionPoolSize: number;
    connectionTimeout: number;
  };
  openai: {
    apiKey: string;
    model: string;                 // Default: gpt-4.1
    maxTokens: number;             // Default: 1024
  };
  rateLimit: {
    windowMs: number;              // Default: 60000 (1 minute)
    max: number;                   // Default: 100
  };
}
```

### 2. Neo4j Route Handler (routes/neo4j.ts)

**Purpose:** Handle all Neo4j-related API endpoints.

**Endpoints:**

#### POST /api/neo4j/query
Execute a Cypher query.

**Request:**
```typescript
interface QueryRequest {
  cypher: string;
  params?: Record<string, any>;
}
```

**Response:**
```typescript
interface QueryResponse {
  nodes: Node[];
  relationships: Relationship[];
  aggregationResults?: any[];
}
```

**Error Response:**
```typescript
interface ErrorResponse {
  error: {
    type: string;
    message: string;
    details?: any;
  };
}
```

#### POST /api/neo4j/expand
Expand a node to fetch connected nodes.

**Request:**
```typescript
interface ExpandRequest {
  nodeId: string;
}
```

**Response:** Same as QueryResponse

#### POST /api/neo4j/schema
Fetch database schema.

**Request:** Empty body

**Response:**
```typescript
interface SchemaResponse {
  nodeLabels: string[];
  relationshipTypes: string[];
  schema: string;
}
```

#### POST /api/neo4j/statistics/nodes
Fetch node statistics.

**Request:**
```typescript
interface NodeStatsRequest {
  limit?: number;
  offset?: number;
}
```

**Response:**
```typescript
interface NodeStatsResponse {
  statistics: Array<{
    label: string;
    count: number;
  }>;
}
```

#### POST /api/neo4j/statistics/relationships
Fetch relationship statistics for a node type.

**Request:**
```typescript
interface RelStatsRequest {
  nodeLabel: string;
  sampleSize?: number;
}
```

**Response:**
```typescript
interface RelStatsResponse {
  statistics: Array<{
    type: string;
    direction: 'incoming' | 'outgoing';
    count: number;
    connectedNodeTypes: string[];
    isSampled: boolean;
    sampleSize?: number;
    totalNodes?: number;
  }>;
}
```

### 3. OpenAI Route Handler (routes/openai.ts)

**Purpose:** Handle OpenAI API proxy requests.

**Endpoints:**

#### POST /api/openai/generate
Generate Cypher query from natural language.

**Request:**
```typescript
interface GenerateRequest {
  query: string;
  schema?: string;
}
```

**Response:**
```typescript
interface GenerateResponse {
  cypherQuery: string;
}
```

### 4. Health Check Handler (routes/health.ts)

**Purpose:** Provide service health status and monitoring.

**Endpoints:**

#### GET /health

**Response:**
```typescript
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    neo4j: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
    };
    openai: {
      status: 'configured' | 'not_configured';
    };
  };
  uptime: number;
}
```

### 5. Neo4j Service (services/neo4jService.ts)

**Purpose:** Manage Neo4j connection and query execution on the server side.

**Key Methods:**
```typescript
class Neo4jProxyService {
  async connect(): Promise<void>;
  async disconnect(): Promise<void>;
  async executeQuery(cypher: string, params?: Record<string, any>): Promise<any>;
  async getSchema(): Promise<SchemaResponse>;
  async getNodeStatistics(options?: NodeStatsRequest): Promise<NodeStatsResponse>;
  async getRelationshipStatistics(nodeLabel: string, options?: { sampleSize?: number }): Promise<RelStatsResponse>;
  async checkHealth(): Promise<{ connected: boolean; responseTime: number }>;
}
```

**Implementation Notes:**
- Reuse existing Neo4j driver logic from frontend
- Maintain connection pool
- Handle driver lifecycle (connect on startup, disconnect on shutdown)
- Transform Neo4j native types to JSON-serializable objects

### 6. OpenAI Service (services/openaiService.ts)

**Purpose:** Proxy OpenAI API requests with server-side credentials.

**Key Methods:**
```typescript
class OpenAIProxyService {
  async generateCypherQuery(query: string, schema?: string): Promise<string>;
  isConfigured(): boolean;
}
```

### 7. Middleware

#### Rate Limiting Middleware
```typescript
const rateLimiter = rateLimit({
  windowMs: 60000,        // 1 minute
  max: 100,               // 100 requests per minute
  message: {
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

#### Request Validation Middleware
```typescript
function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Validate request body against schema
    // Check required fields
    // Validate data types
    // Check payload size (<1MB)
  };
}
```

#### Error Handling Middleware
```typescript
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log error with correlation ID
  // Transform error to standard format
  // Return appropriate HTTP status code
  // Include stack trace in development mode only
}
```

#### CORS Middleware
```typescript
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## Data Models

### Request/Response Types

All types are defined in `types/api.ts`:

```typescript
// Common types
export interface ApiError {
  error: {
    type: string;
    message: string;
    details?: any;
  };
}

// Neo4j types
export interface Node {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface Relationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface GraphData {
  nodes: Node[];
  relationships: Relationship[];
  aggregationResults?: any[];
}
```

## Frontend Service Updates

### Updated Neo4jService (Frontend)

**Changes:**
- Remove direct Neo4j driver import
- Replace driver calls with HTTP fetch to proxy
- Maintain same method signatures
- Add proxy URL configuration

**Example:**
```typescript
// OLD
async executeQuery(cypher: string, params: Record<string, any> = {}): Promise<GraphData> {
  const session = this.driver.session();
  const result = await session.run(cypher, params);
  return this.transformResultToGraphData(result);
}

// NEW
async executeQuery(cypher: string, params: Record<string, any> = {}): Promise<GraphData> {
  const response = await fetch(`${this.proxyUrl}/api/neo4j/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cypher, params })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw this.createError(error.error.type, error.error.message);
  }
  
  return await response.json();
}
```

### Updated OpenAIService (Frontend)

**Changes:**
- Replace direct OpenAI API calls with proxy calls
- Remove API key from frontend
- Maintain same method signatures

**Example:**
```typescript
// OLD
async generateCypherQuery(query: string, schema?: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ /* ... */ })
  });
  // ...
}

// NEW
async generateCypherQuery(query: string, schema?: string): Promise<string> {
  const response = await fetch(`${this.proxyUrl}/api/openai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, schema })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw this.createError(error.error.message, error.error.type);
  }
  
  const data = await response.json();
  return data.cypherQuery;
}
```

## Configuration

### Environment Variables

**Backend (.env):**
```bash
# Server
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_MAX_POOL_SIZE=50
NEO4J_CONNECTION_TIMEOUT=30000

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1
OPENAI_MAX_TOKENS=1024

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

**Frontend (.env):**
```bash
# Remove these (moved to backend):
# VITE_NEO4J_URI=...
# VITE_NEO4J_USERNAME=...
# VITE_NEO4J_PASSWORD=...
# VITE_OPENAI_API_KEY=...

# Add proxy URL:
VITE_PROXY_URL=http://localhost:3001
```

## Error Handling

### Error Types

```typescript
enum ProxyErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NEO4J_CONNECTION_ERROR = 'NEO4J_CONNECTION_ERROR',
  NEO4J_QUERY_ERROR = 'NEO4J_QUERY_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}
```

### Error Response Format

All errors follow this structure:
```typescript
{
  error: {
    type: ProxyErrorType;
    message: string;
    details?: any;
    correlationId?: string;
  }
}
```

### HTTP Status Codes

- 200: Success
- 400: Bad Request (validation errors)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error
- 503: Service Unavailable (Neo4j down)
- 504: Gateway Timeout (query timeout)

## Security Considerations

### 1. Credential Protection
- All credentials stored in server-side environment variables
- Never log credentials
- Use environment variable validation on startup

### 2. Request Validation
- Validate all incoming request bodies
- Limit payload size to 1MB
- Sanitize error messages (no stack traces in production)

### 3. Rate Limiting
- 100 requests per minute per IP
- Configurable limits
- Return retry-after header

### 4. CORS Configuration
- Strict origin validation in production
- Credentials support for cookies (future auth)
- Preflight request handling

### 5. Query Safety
- No query modification or injection prevention (trust frontend)
- Timeout enforcement (30 seconds)
- Connection pool limits

## Performance Considerations

### Connection Pooling
- Maintain persistent Neo4j connection pool
- Configure pool size based on expected load
- Reuse connections across requests

### Response Caching
- No caching at proxy level (keep it simple)
- Let frontend handle caching as it does now
- Consider adding cache headers for future optimization

### Monitoring
- Log request duration
- Track error rates
- Monitor connection pool usage

### Performance Targets
- Proxy overhead: <10ms per request
- Neo4j query: Same as direct connection
- OpenAI query: Same as direct connection
- Health check: <100ms

## Deployment

### Development
```bash
# Terminal 1: Start proxy
cd backend
npm install
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### Production
```bash
# Build
npm run build

# Start with PM2
pm2 start dist/server.js --name graph-proxy

# Or with Docker
docker build -t graph-proxy .
docker run -p 3001:3001 --env-file .env graph-proxy
```

### Docker Configuration

**Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  proxy:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USERNAME=${NEO4J_USERNAME}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - neo4j
```

## Testing Strategy

### Unit Tests

1. **Route Handlers**
   - Test request validation
   - Test error handling
   - Test response formatting
   - Mock Neo4j and OpenAI services

2. **Services**
   - Test Neo4j query execution
   - Test OpenAI API calls
   - Test error transformation
   - Test connection management

3. **Middleware**
   - Test rate limiting
   - Test CORS configuration
   - Test error handling
   - Test request validation

### Integration Tests

1. **End-to-End Flow**
   - Start test server
   - Execute real queries
   - Verify responses
   - Test error scenarios

2. **Health Checks**
   - Test with Neo4j connected
   - Test with Neo4j disconnected
   - Verify response format

### Load Tests

1. **Rate Limiting**
   - Send 150 requests in 1 minute
   - Verify 429 responses after 100

2. **Concurrent Requests**
   - Test connection pool under load
   - Verify no connection leaks

## Migration Plan

### Phase 1: Backend Setup
1. Create backend directory structure
2. Initialize Node.js project
3. Install dependencies
4. Create server entry point
5. Add environment configuration

### Phase 2: Core Proxy Implementation
1. Implement Neo4j service
2. Implement Neo4j routes
3. Implement OpenAI service
4. Implement OpenAI routes
5. Add middleware (CORS, rate limiting, error handling)

### Phase 3: Frontend Updates
1. Update Neo4jService to use proxy
2. Update OpenAIService to use proxy
3. Update environment variables
4. Remove direct driver dependencies
5. Test all existing functionality

### Phase 4: Testing & Documentation
1. Write unit tests
2. Write integration tests
3. Update README with setup instructions
4. Document API endpoints
5. Add deployment guide

### Phase 5: Deployment
1. Test in development
2. Configure production environment
3. Deploy proxy server
4. Update frontend to use production proxy
5. Monitor and verify

## Future Enhancements

1. **Authentication**
   - Add JWT-based authentication
   - User-specific rate limits
   - Query access control

2. **Caching**
   - Redis-based response caching
   - Cache invalidation strategies
   - Configurable TTL

3. **Monitoring**
   - Prometheus metrics
   - Request tracing
   - Performance dashboards

4. **Query Optimization**
   - Query plan analysis
   - Slow query logging
   - Query rewriting hints

5. **WebSocket Support**
   - Real-time query results
   - Streaming large datasets
   - Live statistics updates
