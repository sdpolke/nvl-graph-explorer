/**
 * Environment configuration for the application
 * Centralizes access to environment variables
 */

export const config = {
  neo4j: {
    uri: import.meta.env.VITE_NEO4J_URI || 'bolt://172.52.50.179:7687',
    username: import.meta.env.VITE_NEO4J_USER || 'neo4j',
    password: import.meta.env.VITE_NEO4J_PASSWORD || 'password',
    maxConnectionPoolSize: 50,
    connectionTimeout: 30000,
  },
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  },
} as const;
