import { Request, Response, NextFunction } from 'express';
import { ProxyError, ProxyErrorType } from './errorHandler';

const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB in bytes

export function validatePayloadSize(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const contentLength = req.headers['content-length'];
  
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    throw new ProxyError(
      ProxyErrorType.VALIDATION_ERROR,
      'Request payload exceeds maximum size of 1MB',
      400
    );
  }
  
  next();
}

export function validateJsonBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.method === 'POST' && req.is('application/json') === false) {
    throw new ProxyError(
      ProxyErrorType.VALIDATION_ERROR,
      'Content-Type must be application/json',
      400
    );
  }
  
  next();
}

export function validateRequiredFields(fields: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new ProxyError(
        ProxyErrorType.VALIDATION_ERROR,
        `Missing required fields: ${missing.join(', ')}`,
        400,
        { missingFields: missing }
      );
    }

    next();
  };
}
