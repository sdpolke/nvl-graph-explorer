# Backend Proxy Server

A lightweight Express.js proxy server that secures Neo4j and OpenAI credentials by keeping them server-side. The proxy acts as a secure intermediary between the frontend application and external services.

## Features

- **Credential Security**: All database and API credentials stored server-side
- **Request Proxying**: Forwards Neo4j queries and OpenAI requests
- **Rate Limiting**: 100 requests per minute per IP address
- **CORS Support**: Configurable cross-origin resource sharing
- **Health Monitoring**: Built-in health check endpoint
- **Error Handling**: Standardized error responses with correlation IDs

## Prerequisites

- Node.js 18+
- Neo4j database instance
- OpenAI API key (optional, for natural language queries)

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:4173

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
NEO4J_MAX_POOL_SIZE=50
NEO4J_CONNECTION_TIMEOUT=30000

# OpenAI Configuration (optional)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1024

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### 3. Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3001` (or the port specified in `.env`).

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEO4J_URI` | Neo4j database connection URI | `bolt://localhost:7687` |
| `NEO4J_USERNAME` | Neo4j database username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j database password | `your_password` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173` |
| `NEO4J_MAX_POOL_SIZE` | Max Neo4j connection pool size | `50` |
| `NEO4J_CONNECTION_TIMEOUT` | Neo4j connection timeout (ms) | `30000` |
| `OPENAI_API_KEY` | OpenAI API key for natural language queries | - |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4` |
| `OPENAI_MAX_TOKENS` | Max tokens for OpenAI responses | `1024` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit time window (ms) | `60000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

## API Endpoints

### Neo4j Endpoints

#### POST /api/neo4j/query
Execute a Cypher query against the Neo4j database.

**Request:**
```json
{
  "cypher": "MATCH (n:Gene) RETURN n LIMIT 10",
  "params": {}
}
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "123",
      "labels": ["Gene"],
      "properties": { "name": "TP53", "description": "..." }
    }
  ],
  "relationships": [],
  "aggregationResults": []
}
```

#### POST /api/neo4j/expand
Expand a node to fetch its connected nodes.

**Request:**
```json
{
  "nodeId": "123"
}
```

**Response:** Same format as `/api/neo4j/query`

#### POST /api/neo4j/schema
Fetch the database schema.

**Request:** Empty body `{}`

**Response:**
```json
{
  "nodeLabels": ["Gene", "Protein", "Disease"],
  "relationshipTypes": ["ENCODES", "INTERACTS_WITH"],
  "schema": "(:Gene)-[:ENCODES]->(:Protein)"
}
```

#### POST /api/neo4j/statistics/nodes
Get node count statistics by label.

**Request:**
```json
{
  "limit": 100,
  "offset": 0
}
```

**Response:**
```json
{
  "statistics": [
    { "label": "Gene", "count": 20000 },
    { "label": "Protein", "count": 15000 }
  ]
}
```

#### POST /api/neo4j/statistics/relationships
Get relationship statistics for a node label.

**Request:**
```json
{
  "nodeLabel": "Gene",
  "sampleSize": 1000
}
```

**Response:**
```json
{
  "statistics": [
    {
      "type": "ENCODES",
      "direction": "outgoing",
      "count": 5000,
      "connectedNodeTypes": ["Protein"],
      "isSampled": true,
      "sampleSize": 1000,
      "totalNodes": 20000
    }
  ]
}
```

### OpenAI Endpoints

#### POST /api/openai/generate
Generate a Cypher query from natural language.

**Request:**
```json
{
  "query": "Show me genes related to cancer",
  "schema": "(:Gene)-[:ASSOCIATED_WITH]->(:Disease)"
}
```

**Response:**
```json
{
  "cypherQuery": "MATCH (g:Gene)-[:ASSOCIATED_WITH]->(d:Disease) WHERE d.name CONTAINS 'cancer' RETURN g, d LIMIT 50"
}
```

### Health Check

#### GET /health
Check the health status of the proxy server and its dependencies.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "neo4j": {
      "status": "connected",
      "responseTime": 45
    },
    "openai": {
      "status": "configured"
    }
  },
  "uptime": 3600
}
```

**Status Codes:**
- `200 OK` - All services healthy
- `503 Service Unavailable` - Neo4j disconnected or other critical failure

## Error Responses

All errors follow a standardized format:

```json
{
  "error": {
    "type": "NEO4J_CONNECTION_ERROR",
    "message": "Failed to connect to Neo4j database",
    "details": {},
    "correlationId": "abc-123-def"
  }
}
```

### Error Types

| Type | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters | 400 |
| `NEO4J_CONNECTION_ERROR` | Cannot connect to Neo4j | 503 |
| `NEO4J_QUERY_ERROR` | Query execution failed | 500 |
| `OPENAI_ERROR` | OpenAI API request failed | 500 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `TIMEOUT_ERROR` | Request timeout | 504 |
| `INTERNAL_ERROR` | Unexpected server error | 500 |

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment configuration
│   ├── middleware/
│   │   ├── correlationId.ts    # Request correlation IDs
│   │   ├── corsConfig.ts       # CORS configuration
│   │   ├── errorHandler.ts     # Error handling
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   ├── requestLogger.ts    # Request logging
│   │   └── requestValidator.ts # Request validation
│   ├── routes/
│   │   ├── health.ts           # Health check endpoint
│   │   ├── neo4j.ts            # Neo4j proxy routes
│   │   └── openai.ts           # OpenAI proxy routes
│   ├── services/
│   │   ├── neo4jService.ts     # Neo4j service layer
│   │   └── openaiService.ts    # OpenAI service layer
│   └── server.ts               # Server entry point
├── dist/                        # Compiled JavaScript (generated)
├── .env                         # Environment variables (not committed)
├── .env.example                 # Example environment variables
├── package.json
└── tsconfig.json
```

### Running in Development

The development server uses `nodemon` and `ts-node` for automatic reloading:

```bash
npm run dev
```

Changes to TypeScript files will automatically restart the server.

### Building for Production

Compile TypeScript to JavaScript:

```bash
npm run build
```

This creates optimized JavaScript files in the `dist/` directory.

### Running Tests

```bash
npm test
```

## Deployment

### Using Node.js

1. Build the application:
   ```bash
   npm run build
   ```

2. Set production environment variables in `.env`

3. Start the server:
   ```bash
   NODE_ENV=production npm start
   ```

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the server
pm2 start dist/server.js --name graph-proxy

# View logs
pm2 logs graph-proxy

# Restart
pm2 restart graph-proxy

# Stop
pm2 stop graph-proxy
```

### Using Docker

See the main project README for Docker deployment instructions.

## Security Considerations

1. **Never commit `.env` files** - Credentials should only exist on the server
2. **Use HTTPS in production** - Deploy behind a reverse proxy (nginx, Caddy)
3. **Restrict CORS origins** - Only allow your frontend domain in production
4. **Monitor rate limits** - Adjust based on your usage patterns
5. **Keep dependencies updated** - Run `npm audit` regularly

## Troubleshooting

### Cannot connect to Neo4j

**Error:** `NEO4J_CONNECTION_ERROR`

**Solutions:**
- Verify `NEO4J_URI` is correct
- Check Neo4j is running: `systemctl status neo4j` or Docker logs
- Test connection: `curl http://localhost:7474`
- Verify credentials are correct
- Check firewall rules

### Rate limit errors

**Error:** `RATE_LIMIT_EXCEEDED`

**Solutions:**
- Increase `RATE_LIMIT_MAX` in `.env`
- Increase `RATE_LIMIT_WINDOW_MS` for longer time windows
- Implement request batching in frontend
- Use caching to reduce duplicate requests

### CORS errors

**Error:** Browser console shows CORS policy errors

**Solutions:**
- Add your frontend URL to `CORS_ORIGINS` in `.env`
- Ensure origins include protocol and port: `http://localhost:5173`
- Restart the server after changing `.env`
- Check browser network tab for actual origin being sent

### OpenAI not working

**Error:** `OPENAI_ERROR` or natural language queries fail

**Solutions:**
- Verify `OPENAI_API_KEY` is set and valid
- Check OpenAI API status: https://status.openai.com
- Verify you have API credits remaining
- Check the model name is correct (e.g., `gpt-4`, `gpt-3.5-turbo`)

## Monitoring

### Health Checks

Monitor the `/health` endpoint:

```bash
curl http://localhost:3001/health
```

### Logs

The server logs all requests and errors to stdout:

```
[2024-01-15T10:30:00.000Z] POST /api/neo4j/query - 200 - 45ms - ::1
[2024-01-15T10:30:05.000Z] ERROR: Neo4j query failed - correlation-id: abc-123
```

### Metrics

Key metrics to monitor:
- Request rate (requests/minute)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- Neo4j connection pool usage
- Rate limit hits

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the main project README
3. Check the design document in `.kiro/specs/backend-proxy/design.md`
4. Review server logs for error details
