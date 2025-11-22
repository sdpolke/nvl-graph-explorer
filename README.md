# NVL Graph Explorer

A modern graph explorer application built with React, TypeScript, and Neo4j NVL (Network Visualization Library) for visualizing and exploring healthcare knowledge graphs.

## Architecture

This application uses a **backend proxy architecture** to secure database and API credentials:

```
Browser (Frontend)  →  Express Proxy Server  →  Neo4j Database
                                             →  OpenAI API
```

The proxy server keeps all credentials server-side, preventing exposure in the browser.

## Project Structure

```
nvl-graph-explorer/
├── src/                    # Frontend application
│   ├── components/         # React components
│   ├── services/           # API client services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration files
│   ├── App.tsx             # Root application component
│   └── main.tsx            # Application entry point
├── backend/                # Backend proxy server
│   ├── src/
│   │   ├── config/         # Server configuration
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   └── server.ts       # Server entry point
│   ├── .env                # Backend environment variables (not committed)
│   └── package.json        # Backend dependencies
├── .env                    # Frontend environment variables (not committed)
├── .env.example            # Example frontend environment variables
└── package.json            # Root project dependencies
```

## Technology Stack

- **React 19** - UI framework
- **TypeScript 5.9** - Type-safe JavaScript
- **Vite 7** - Build tool and dev server
- **@neo4j-nvl/react** - Neo4j Network Visualization Library
- **neo4j-driver** - Neo4j database driver
- **OpenAI API** - Natural language to Cypher query conversion

## Prerequisites

- Node.js 18+ and npm
- Neo4j database instance (local or remote)
- OpenAI API key (optional, for natural language queries)

## Quick Start

### 1. Install Dependencies

Install dependencies for both frontend and backend:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Backend

Create and configure the backend environment:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```bash
# Required
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Optional
OPENAI_API_KEY=sk-your-api-key-here
PORT=3001
CORS_ORIGINS=http://localhost:5173
```

See `backend/README.md` for all configuration options.

### 3. Configure Frontend

Create and configure the frontend environment:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
VITE_PROXY_URL=http://localhost:3001
```

**Note:** Database credentials are NO LONGER needed in the frontend `.env` file. They are now securely stored in the backend.

### 4. Start Development Servers

**Option A: Start both servers together** (recommended):
```bash
npm run dev:all
```

**Option B: Start servers separately**:

Terminal 1 - Backend:
```bash
npm run dev:backend
# or: cd backend && npm run dev
```

Terminal 2 - Frontend:
```bash
npm run dev
```

### 5. Open the Application

Navigate to `http://localhost:5173` in your browser.

## Available Scripts

### Root Project Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend development server |
| `npm run dev:backend` | Start backend proxy server |
| `npm run dev:all` | Start both frontend and backend |
| `npm run build` | Build frontend for production |
| `npm run build:backend` | Build backend for production |
| `npm run build:all` | Build both frontend and backend |
| `npm start:backend` | Start backend in production mode |
| `npm run lint` | Run ESLint on frontend code |
| `npm test` | Run frontend tests |

### Backend Scripts

See `backend/README.md` for backend-specific scripts and documentation.

## Features

### Natural Language Search
The application supports natural language queries powered by OpenAI. Simply type questions in plain English:

- "Show me genes related to cancer"
- "Find proteins that interact with TP53"
- "What drugs treat diabetes?"

The AI will automatically convert your question to a Cypher query and execute it against the Neo4j database.

### Direct Cypher Queries
For advanced users, you can toggle to Cypher mode and write queries directly:

```cypher
MATCH (g:Gene)-[r:ENCODES]->(p:Protein) RETURN g, r, p LIMIT 50
```

### Interactive Graph Visualization
- Click nodes to view details
- Double-click nodes to expand and show connected entities
- Zoom and pan to explore large graphs
- Color-coded nodes by entity type (Gene, Protein, Disease, etc.)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## TypeScript Configuration

The project uses strict TypeScript configuration with the following enabled:
- Strict mode
- No unused locals
- No unused parameters
- No fallthrough cases in switch
- No unchecked side effect imports

## Environment Variables

### Frontend Variables

The frontend only needs the proxy URL:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PROXY_URL` | Backend proxy server URL | `http://localhost:3001` |

### Backend Variables

The backend requires database and API credentials. See `backend/README.md` for the complete list.

**Security Note:** Database credentials and API keys are ONLY stored in the backend `.env` file and are never exposed to the browser.

## Deployment

### Development Deployment

1. Start both servers using `npm run dev:all`
2. Frontend runs on `http://localhost:5173`
3. Backend runs on `http://localhost:3001`

### Production Deployment

#### Build Applications

```bash
# Build both frontend and backend
npm run build:all
```

#### Deploy Backend

```bash
cd backend

# Option 1: Using Node.js
NODE_ENV=production npm start

# Option 2: Using PM2
pm2 start dist/server.js --name graph-proxy

# Option 3: Using Docker
docker build -t graph-proxy .
docker run -p 3001:3001 --env-file .env graph-proxy
```

#### Deploy Frontend

```bash
# Serve the dist/ directory using any static file server
# Examples:
npx serve -s dist -p 5173
# or nginx, Apache, Caddy, etc.
```

#### Production Environment Variables

**Backend** (`backend/.env`):
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://yourdomain.com
NEO4J_URI=bolt://your-neo4j-server:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
OPENAI_API_KEY=sk-your-api-key
```

**Frontend** (`.env.production`):
```bash
VITE_PROXY_URL=https://api.yourdomain.com
```

### Docker Deployment

A `docker-compose.yml` file can be created to run both services:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USERNAME=${NEO4J_USERNAME}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - CORS_ORIGINS=http://localhost:5173
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "5173:80"
    environment:
      - VITE_PROXY_URL=http://backend:3001
    depends_on:
      - backend
    restart: unless-stopped
```

## Security

### Credential Management

- ✅ Database credentials stored server-side only
- ✅ API keys never exposed to browser
- ✅ CORS protection enabled
- ✅ Rate limiting (100 req/min per IP)
- ✅ Request validation and sanitization

### Best Practices

1. **Never commit `.env` files** - Use `.env.example` as templates
2. **Use HTTPS in production** - Deploy behind a reverse proxy
3. **Restrict CORS origins** - Only allow your frontend domain
4. **Rotate credentials regularly** - Especially API keys
5. **Monitor logs** - Watch for suspicious activity

## Troubleshooting

### Backend won't start

- Check `backend/.env` has all required variables
- Verify Neo4j is running and accessible
- Check port 3001 is not already in use
- Review backend logs for specific errors

### Frontend can't connect to backend

- Verify backend is running on the correct port
- Check `VITE_PROXY_URL` in frontend `.env`
- Ensure CORS_ORIGINS in backend includes frontend URL
- Check browser console for CORS errors

### Neo4j connection errors

- Verify `NEO4J_URI` format: `bolt://host:port`
- Test Neo4j connection: `curl http://localhost:7474`
- Check credentials are correct
- Ensure Neo4j allows remote connections

### Rate limit errors

- Increase `RATE_LIMIT_MAX` in backend `.env`
- Implement request caching in frontend
- Batch multiple requests when possible

For more troubleshooting help, see `backend/README.md`.

## Development

This project follows the spec-driven development approach. See the design and requirements documents in `.kiro/specs/backend-proxy/` for detailed information about the proxy architecture and implementation plan.
