import { Router, Request, Response, NextFunction } from 'express';
import { neo4jProxyService } from '../services/neo4jService';
import { ProxyError, ProxyErrorType } from '../middleware/errorHandler';
import { validateRequiredFields } from '../middleware/requestValidator';

const router = Router();

// POST /api/neo4j/query - Execute a Cypher query
router.post(
  '/query',
  validateRequiredFields(['cypher']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cypher, params = {} } = req.body;

      if (typeof cypher !== 'string') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'cypher must be a string',
          400
        );
      }

      if (params && typeof params !== 'object') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'params must be an object',
          400
        );
      }

      const result = await neo4jProxyService.executeQuery(cypher, params);
      res.json(result);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Not connected')) {
        next(new ProxyError(
          ProxyErrorType.NEO4J_CONNECTION_ERROR,
          'Database connection not available',
          503
        ));
      } else {
        next(new ProxyError(
          ProxyErrorType.NEO4J_QUERY_ERROR,
          `Query execution failed: ${errorMessage}`,
          500,
          { originalError: errorMessage }
        ));
      }
    }
  }
);

// POST /api/neo4j/expand - Expand a node to fetch connected nodes
router.post(
  '/expand',
  validateRequiredFields(['nodeId']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nodeId } = req.body;

      if (typeof nodeId !== 'string') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'nodeId must be a string',
          400
        );
      }

      const cypher = `
        MATCH (n)
        WHERE elementId(n) = $nodeId
        OPTIONAL MATCH (n)-[r]-(connected)
        RETURN n, r, connected
        LIMIT 100
      `;

      const result = await neo4jProxyService.executeQuery(cypher, { nodeId });
      res.json(result);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Not connected')) {
        next(new ProxyError(
          ProxyErrorType.NEO4J_CONNECTION_ERROR,
          'Database connection not available',
          503
        ));
      } else {
        next(new ProxyError(
          ProxyErrorType.NEO4J_QUERY_ERROR,
          `Node expansion failed: ${errorMessage}`,
          500,
          { originalError: errorMessage }
        ));
      }
    }
  }
);

// POST /api/neo4j/schema - Fetch database schema
router.post(
  '/schema',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const schema = await neo4jProxyService.getSchema();
      res.json(schema);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Not connected')) {
        next(new ProxyError(
          ProxyErrorType.NEO4J_CONNECTION_ERROR,
          'Database connection not available',
          503
        ));
      } else {
        next(new ProxyError(
          ProxyErrorType.NEO4J_QUERY_ERROR,
          `Schema fetch failed: ${errorMessage}`,
          500,
          { originalError: errorMessage }
        ));
      }
    }
  }
);

// POST /api/neo4j/statistics/nodes - Fetch node statistics
router.post(
  '/statistics/nodes',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { limit, offset } = req.body;

      if (limit !== undefined && (typeof limit !== 'number' || limit < 1)) {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'limit must be a positive number',
          400
        );
      }

      if (offset !== undefined && (typeof offset !== 'number' || offset < 0)) {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'offset must be a non-negative number',
          400
        );
      }

      const options = { limit, offset };
      const statistics = await neo4jProxyService.getNodeStatistics(options);
      res.json(statistics);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Not connected')) {
        next(new ProxyError(
          ProxyErrorType.NEO4J_CONNECTION_ERROR,
          'Database connection not available',
          503
        ));
      } else {
        next(new ProxyError(
          ProxyErrorType.NEO4J_QUERY_ERROR,
          `Node statistics fetch failed: ${errorMessage}`,
          500,
          { originalError: errorMessage }
        ));
      }
    }
  }
);

// POST /api/neo4j/statistics/relationships - Fetch relationship statistics
router.post(
  '/statistics/relationships',
  validateRequiredFields(['nodeLabel']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { nodeLabel, sampleSize } = req.body;

      if (typeof nodeLabel !== 'string') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'nodeLabel must be a string',
          400
        );
      }

      if (sampleSize !== undefined && (typeof sampleSize !== 'number' || sampleSize < 1)) {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'sampleSize must be a positive number',
          400
        );
      }

      const options = sampleSize ? { sampleSize } : undefined;
      const statistics = await neo4jProxyService.getRelationshipStatistics(nodeLabel, options);
      res.json(statistics);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Not connected')) {
        next(new ProxyError(
          ProxyErrorType.NEO4J_CONNECTION_ERROR,
          'Database connection not available',
          503
        ));
      } else {
        next(new ProxyError(
          ProxyErrorType.NEO4J_QUERY_ERROR,
          `Relationship statistics fetch failed: ${errorMessage}`,
          500,
          { originalError: errorMessage }
        ));
      }
    }
  }
);

export default router;
