import dotenv from 'dotenv';

dotenv.config();

export interface ServerConfig {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  neo4j: {
    uri: string;
    username: string;
    password: string;
    maxConnectionPoolSize: number;
    connectionTimeout: number;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

function validateRequired(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return ['http://localhost:5173'];
  return value.split(',').map(origin => origin.trim()).filter(Boolean);
}

function loadConfig(): ServerConfig {
  const requiredVars = {
    neo4jUri: validateRequired('NEO4J_URI', process.env.NEO4J_URI),
    neo4jUsername: validateRequired('NEO4J_USERNAME', process.env.NEO4J_USERNAME),
    neo4jPassword: validateRequired('NEO4J_PASSWORD', process.env.NEO4J_PASSWORD),
    openaiApiKey: validateRequired('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
  };

  return {
    port: parseNumber(process.env.PORT, 3001),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
    neo4j: {
      uri: requiredVars.neo4jUri,
      username: requiredVars.neo4jUsername,
      password: requiredVars.neo4jPassword,
      maxConnectionPoolSize: parseNumber(process.env.NEO4J_MAX_POOL_SIZE, 50),
      connectionTimeout: parseNumber(process.env.NEO4J_CONNECTION_TIMEOUT, 30000),
    },
    openai: {
      apiKey: requiredVars.openaiApiKey,
      model: process.env.OPENAI_MODEL || 'gpt-4',
      maxTokens: parseNumber(process.env.OPENAI_MAX_TOKENS, 1024),
    },
    rateLimit: {
      windowMs: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),
      max: parseNumber(process.env.RATE_LIMIT_MAX, 100),
    },
  };
}

export const config = loadConfig();
