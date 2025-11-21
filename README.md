# NVL Graph Explorer

A modern graph explorer application built with React, TypeScript, and Neo4j NVL (Network Visualization Library) for visualizing and exploring healthcare knowledge graphs.

## Project Structure

```
nvl-graph-explorer/
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic and API services
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── styles/         # CSS modules and styling
│   ├── config/         # Configuration files
│   │   └── env.ts      # Environment configuration
│   ├── App.tsx         # Root application component
│   └── main.tsx        # Application entry point
├── .env                # Environment variables (not committed)
├── .env.example        # Example environment variables
└── package.json        # Project dependencies
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
- Access to a Neo4j database instance

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the following:
   - `VITE_NEO4J_URI` - Neo4j database URI
   - `VITE_NEO4J_USER` - Neo4j username
   - `VITE_NEO4J_PASSWORD` - Neo4j password
   - `VITE_OPENAI_API_KEY` - OpenAI API key (for natural language queries)

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

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

All environment variables must be prefixed with `VITE_` to be accessible in the application.

See `.env.example` for the complete list of required variables.

## Development

This project follows the spec-driven development approach. See the design and requirements documents in `.kiro/specs/nvl-graph-explorer/` for detailed information about the architecture and implementation plan.
