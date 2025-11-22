import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export function correlationId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const id = req.headers['x-correlation-id'] as string || 
             randomBytes(16).toString('hex');
  
  req.headers['x-correlation-id'] = id;
  res.setHeader('X-Correlation-ID', id);
  
  next();
}
