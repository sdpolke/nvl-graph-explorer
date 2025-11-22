import { Request, Response, NextFunction } from 'express';

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const correlationId = req.headers['x-correlation-id'] as string;
  const clientIp = req.ip || 
                   req.headers['x-forwarded-for'] || 
                   req.socket.remoteAddress || 
                   'unknown';

  console.log(`[${timestamp}] ${req.method} ${req.path}`, {
    correlationId,
    clientIp,
    userAgent: req.headers['user-agent']
  });

  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      correlationId,
      clientIp
    });
  });

  next();
}
