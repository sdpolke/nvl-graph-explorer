import express, { Application } from 'express';
import { config } from './config/env';
import { neo4jProxyService } from './services/neo4jService';
import {
  corsMiddleware,
  rateLimiter,
  errorHandler,
  validatePayloadSize,
  validateJsonBody,
  correlationId,
  requestLogger,
} from './middleware/index';
import neo4jRoutes from './routes/neo4j';
import openaiRoutes from './routes/openai';
import healthRoutes from './routes/health';
import chatRoutes from './routes/chat';

const app: Application = express();

function logStartupConfig(): void {
  console.log('='.repeat(50));
  console.log('Backend Proxy Server Configuration');
  console.log('='.repeat(50));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Port: ${config.port}`);
  console.log(`CORS Origins: ${config.corsOrigins.join(', ')}`);
  console.log(`Neo4j URI: ${config.neo4j.uri}`);
  console.log(`Neo4j Max Pool Size: ${config.neo4j.maxConnectionPoolSize}`);
  console.log(`Neo4j Connection Timeout: ${config.neo4j.connectionTimeout}ms`);
  console.log(`OpenAI Model: ${config.openai.model}`);
  console.log(`OpenAI Max Tokens: ${config.openai.maxTokens}`);
  console.log(`Rate Limit: ${config.rateLimit.max} requests per ${config.rateLimit.windowMs}ms`);
  console.log('='.repeat(50));
}

function registerMiddleware(app: Application): void {
  app.use(correlationId);
  app.use(requestLogger);
  app.use(corsMiddleware);
  app.use(validatePayloadSize);
  app.use(validateJsonBody);
  app.use(express.json());
  
  // Handle JSON parsing errors
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid JSON in request body',
          correlationId: req.headers['x-correlation-id']
        }
      });
      return;
    }
    next(err);
  });
  
  app.use(rateLimiter);
}

function registerRoutes(app: Application): void {
  app.use('/api/neo4j', neo4jRoutes);
  app.use('/api/openai', openaiRoutes);
  app.use('/api/chat', chatRoutes);
  app.use(healthRoutes);
}

async function startServer(): Promise<void> {
  try {
    logStartupConfig();

    await neo4jProxyService.connect();

    registerMiddleware(app);
    registerRoutes(app);
    app.use(errorHandler);

    const server = app.listen(config.port, () => {
      console.log(`\n✓ Server running on port ${config.port}`);
      console.log(`✓ Health check: http://localhost:${config.port}/health`);
      console.log(`✓ Neo4j API: http://localhost:${config.port}/api/neo4j/*`);
      console.log(`✓ OpenAI API: http://localhost:${config.port}/api/openai/*`);
      console.log(`✓ Chat API: http://localhost:${config.port}/api/chat/*\n`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await neo4jProxyService.disconnect();
          console.log('Graceful shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
