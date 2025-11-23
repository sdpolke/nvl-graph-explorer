import { Router, Request, Response, NextFunction } from 'express';
import { neo4jProxyService } from '../services/neo4jService';
import { EmbeddingService } from '../services/embeddingService';
import { HybridSearchService } from '../services/hybridSearchService';
import { ResponseGenerator } from '../services/responseGenerator';
import { conversationManager, Conversation } from '../services/conversationManager';
import { ProxyError, ProxyErrorType } from '../middleware/errorHandler';
import { validateRequiredFields } from '../middleware/requestValidator';

const router = Router();

// Initialize services
let hybridSearchService: HybridSearchService;
let responseGenerator: ResponseGenerator;

// Lazy initialization to ensure driver is connected
function getServices() {
  if (!hybridSearchService) {
    const driver = neo4jProxyService.getDriver();
    const embeddingService = new EmbeddingService();
    hybridSearchService = new HybridSearchService(driver, embeddingService);
    responseGenerator = new ResponseGenerator();
  }
  return { hybridSearchService, responseGenerator };
}

/**
 * POST /api/chat/message
 * Send a chat message and receive a response
 */
router.post(
  '/message',
  validateRequiredFields(['message']),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, conversationId, includeGraph = false } = req.body;

      // Validate message
      if (typeof message !== 'string' || message.trim().length === 0) {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'message must be a non-empty string',
          400
        );
      }

      if (conversationId && typeof conversationId !== 'string') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'conversationId must be a string',
          400
        );
      }

      if (typeof includeGraph !== 'boolean') {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          'includeGraph must be a boolean',
          400
        );
      }

      // Get or create conversation
      let conversation: Conversation;
      if (conversationId) {
        const existing = conversationManager.getConversation(conversationId);
        if (existing) {
          conversation = existing;
        } else {
          console.warn(`Conversation ${conversationId} not found, creating new one`);
          conversation = conversationManager.createConversation();
        }
      } else {
        conversation = conversationManager.createConversation();
      }

      // Add user message to conversation
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Get services
      const { hybridSearchService, responseGenerator } = getServices();

      // Step 1: Retrieve - Perform hybrid search
      const searchResult = await hybridSearchService.search(message, {
        mode: undefined, // Let it auto-route
        limit: 10,
        maxHops: 2
      });

      // Step 2: Expand - Already done by hybrid search service

      // Step 3: Generate - Generate response with context
      const conversationContext = await conversationManager.getContext(conversation.id);
      const generatedResponse = await responseGenerator.generate(
        message,
        searchResult,
        conversationContext
      );

      // Add assistant message to conversation
      await conversationManager.addMessage(conversation.id, {
        role: 'assistant',
        content: generatedResponse.answer,
        timestamp: new Date(),
        sources: generatedResponse.sources,
        graphData: includeGraph ? searchResult.graphData : undefined
      });

      // Build response
      const response: any = {
        answer: generatedResponse.answer,
        sources: generatedResponse.sources,
        conversationId: conversation.id,
        queryType: searchResult.queryType
      };

      if (includeGraph) {
        response.graphData = searchResult.graphData;
      }

      res.json(response);
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      // Handle OpenAI errors
      if (error.type === 'OPENAI_NOT_CONFIGURED') {
        next(new ProxyError(
          ProxyErrorType.OPENAI_ERROR,
          error.message,
          503
        ));
        return;
      }

      if (error.type === 'OPENAI_ERROR' || error.type === 'OPENAI_API_ERROR') {
        next(new ProxyError(
          ProxyErrorType.OPENAI_ERROR,
          error.message,
          error.statusCode || 500,
          error.details
        ));
        return;
      }

      // Handle Neo4j errors
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
          `Chat message processing failed: ${errorMessage}`,
          500,
          { originalError: errorMessage }
        ));
      }
    }
  }
);

/**
 * GET /api/chat/conversations/:id
 * Retrieve a conversation by ID
 */
router.get(
  '/conversations/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const conversation = conversationManager.getConversation(id);

      if (!conversation) {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          `Conversation ${id} not found`,
          404
        );
      }

      res.json({
        id: conversation.id,
        messages: conversation.messages,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString()
      });
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      next(new ProxyError(
        ProxyErrorType.VALIDATION_ERROR,
        `Failed to retrieve conversation: ${error.message}`,
        500
      ));
    }
  }
);

/**
 * DELETE /api/chat/conversations/:id
 * Clear a conversation
 */
router.delete(
  '/conversations/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      // Check if conversation exists
      const conversation = conversationManager.getConversation(id);
      
      if (!conversation) {
        throw new ProxyError(
          ProxyErrorType.VALIDATION_ERROR,
          `Conversation ${id} not found`,
          404
        );
      }

      await conversationManager.clearConversation(id);

      res.json({
        success: true,
        message: `Conversation ${id} cleared successfully`
      });
    } catch (error: any) {
      if (error instanceof ProxyError) {
        next(error);
        return;
      }

      next(new ProxyError(
        ProxyErrorType.VALIDATION_ERROR,
        `Failed to clear conversation: ${error.message}`,
        500
      ));
    }
  }
);

export default router;
