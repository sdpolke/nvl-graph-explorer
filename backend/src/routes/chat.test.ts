/**
 * Integration tests for chat API endpoints
 * Tests request validation and response format
 */

import request from 'supertest';
import express, { Application } from 'express';
import chatRoutes from './chat';
import { conversationManager } from '../services/conversationManager';
import { errorHandler } from '../middleware/errorHandler';

describe('Chat API Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    conversationManager.clearAll();
  });

  describe('POST /api/chat/message - Validation', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate message is non-empty string', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: '' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate message is a string', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({ message: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate conversationId is a string if provided', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message',
          conversationId: 123
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate includeGraph is a boolean if provided', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({
          message: 'Test message',
          includeGraph: 'true'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/chat/conversations/:id', () => {
    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/chat/conversations/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should retrieve conversation if it exists', async () => {
      // Create a conversation directly
      const conversation = conversationManager.createConversation();
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      const response = await request(app)
        .get(`/api/chat/conversations/${conversation.id}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(conversation.id);
      expect(response.body.messages).toBeDefined();
      expect(Array.isArray(response.body.messages)).toBe(true);
      expect(response.body.messages.length).toBe(1);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
    });
  });

  describe('DELETE /api/chat/conversations/:id', () => {
    it('should return 404 when deleting non-existent conversation', async () => {
      const response = await request(app)
        .delete('/api/chat/conversations/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    it('should clear an existing conversation', async () => {
      // Create a conversation directly
      const conversation = conversationManager.createConversation();
      await conversationManager.addMessage(conversation.id, {
        role: 'user',
        content: 'Test message',
        timestamp: new Date()
      });

      // Verify conversation exists
      expect(conversationManager.getConversation(conversation.id)).toBeDefined();

      // Delete the conversation
      const deleteResponse = await request(app)
        .delete(`/api/chat/conversations/${conversation.id}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Verify conversation is deleted
      expect(conversationManager.getConversation(conversation.id)).toBeUndefined();

      // Verify GET returns 404
      const getResponse = await request(app)
        .get(`/api/chat/conversations/${conversation.id}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('Response Format', () => {
    it('should return proper error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/chat/message')
        .send({});

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('type');
      expect(response.body.error).toHaveProperty('message');
    });
  });
});
