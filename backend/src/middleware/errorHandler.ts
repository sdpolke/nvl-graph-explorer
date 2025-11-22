import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export enum ProxyErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NEO4J_CONNECTION_ERROR = 'NEO4J_CONNECTION_ERROR',
  NEO4J_QUERY_ERROR = 'NEO4J_QUERY_ERROR',
  OPENAI_ERROR = 'OPENAI_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

export class ProxyError extends Error {
  constructor(
    public type: ProxyErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ProxyError';
  }
}

export function errorHandler(
  err: Error | ProxyError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = req.headers['x-correlation-id'] as string;
  
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error [${correlationId}]:`, {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  if (err instanceof ProxyError) {
    res.status(err.statusCode).json({
      error: {
        type: err.type,
        message: err.message,
        details: config.nodeEnv === 'development' ? err.details : undefined,
        correlationId
      }
    });
    return;
  }

  res.status(500).json({
    error: {
      type: ProxyErrorType.INTERNAL_ERROR,
      message: config.nodeEnv === 'development' 
        ? err.message 
        : 'An internal error occurred',
      correlationId
    }
  });
}
