import { Router, Request, Response, NextFunction } from 'express';
import { openaiProxyService } from '../services/openaiService';
import { ProxyError, ProxyErrorType } from '../middleware/errorHandler';
import { validateRequiredFields } from '../middleware/requestValidator';

const router = Router();

// POST /api/openai/generate - Generate Cypher query from natural language
router.post(
  '/generate',
  validateRequiredFields(['query']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { query, schema } = req.body;

      if (typeof query !== 'string') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'query must be a string',
          400
        );
      }

      if (schema !== undefined && typeof schema !== 'string') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'schema must be a string',
          400
        );
      }

      const result = await openaiProxyService.generateCypherQuery({ query, schema });
      res.json(result);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      if (error.type) {
        next(new ProxyError(
          ProxyErrorType.OPENAI_ERROR,
          error.message,
          error.statusCode || 500,
          error.details
        ));
        return;
      }

      next(new ProxyError(
        ProxyErrorType.OPENAI_ERROR,
        `OpenAI request failed: ${error.message || 'Unknown error'}`,
        500,
        { originalError: error.message }
      ));
    }
  }
);

export default router;
