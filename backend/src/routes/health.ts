import { Router, Request, Response } from 'express';
import { neo4jProxyService } from '../services/neo4jService';
import { openaiProxyService } from '../services/openaiService';

const router = Router();

const startTime = Date.now();

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    neo4j: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
    };
    openai: {
      status: 'configured' | 'not_configured';
    };
  };
  uptime: number;
}

router.get('/health', async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  const neo4jHealth = await neo4jProxyService.checkHealth();
  const openaiConfigured = openaiProxyService.isConfigured();

  const healthResponse: HealthResponse = {
    status: 'healthy',
    timestamp,
    services: {
      neo4j: {
        status: neo4jHealth.connected ? 'connected' : 'disconnected',
        responseTime: neo4jHealth.responseTime,
      },
      openai: {
        status: openaiConfigured ? 'configured' : 'not_configured',
      },
    },
    uptime,
  };

  if (!neo4jHealth.connected) {
    healthResponse.status = 'unhealthy';
    res.status(503).json(healthResponse);
    return;
  }

  if (!openaiConfigured) {
    healthResponse.status = 'degraded';
  }

  res.status(200).json(healthResponse);
});

export default router;
