/**
 * Integration tests for ChatService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService, ChatServiceError } from './ChatService';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockFetch: any;

  beforeEach(() => {
    chatService = new ChatService('http://localhost:3001');
    mockFetch = vi.fn();
    (globalThis as any).fetch = mockFetch;
  });

  describe('sendMessage', () => {
    it('should send message and parse response correctly', async () => {
      const mockResponse = {
        answer: 'Test answer',
        sources: [
          {
            entityType: 'Drug',
            entityName: 'Aspirin',
            nodeId: '123',
            relevanceScore: 0.95,
            excerpt: 'Test excerpt',
            properties: { name: 'Aspirin' }
          }
        ],
        conversationId: 'conv-123',
        queryType: 'semantic'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await chatService.sendMessage({
        message: 'What is Aspirin?'
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/message',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'What is Aspirin?' })
        })
      );
    });

    it('should include conversationId when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          answer: 'Follow-up answer',
          sources: [],
          conversationId: 'conv-123',
          queryType: 'hybrid'
        })
      });

      await chatService.sendMessage({
        message: 'Tell me more',
        conversationId: 'conv-123'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/message',
        expect.objectContaining({
          body: JSON.stringify({
            message: 'Tell me more',
            conversationId: 'conv-123'
          })
        })
      );
    });

    it('should include graph data when requested', async () => {
      const mockResponse = {
        answer: 'Test answer',
        sources: [],
        conversationId: 'conv-123',
        queryType: 'semantic',
        graphData: {
          nodes: [{ id: '1', labels: ['Drug'], properties: { name: 'Aspirin' } }],
          relationships: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await chatService.sendMessage({
        message: 'Show me drugs',
        includeGraph: true
      });

      expect(result.graphData).toBeDefined();
      expect(result.graphData?.nodes).toHaveLength(1);
    });

    it('should handle error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid message',
            details: { field: 'message' }
          }
        })
      });

      await expect(
        chatService.sendMessage({ message: '' })
      ).rejects.toThrow(ChatServiceError);
    });

    it('should retry on rate limit (429)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: async () => ({ error: { message: 'Rate limit' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            answer: 'Success after retry',
            sources: [],
            conversationId: 'conv-123',
            queryType: 'hybrid'
          })
        });

      const result = await chatService.sendMessage({
        message: 'Test message'
      });

      expect(result.answer).toBe('Success after retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on server error (500)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'Server error' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            answer: 'Success after retry',
            sources: [],
            conversationId: 'conv-123',
            queryType: 'hybrid'
          })
        });

      const result = await chatService.sendMessage({
        message: 'Test message'
      });

      expect(result.answer).toBe('Success after retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation successfully', async () => {
      const mockConversation = {
        id: 'conv-123',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString()
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockConversation
      });

      const result = await chatService.getConversation('conv-123');

      expect(result).toEqual(mockConversation);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/conv-123',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should handle conversation not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: 'Conversation not found' }
        })
      });

      await expect(
        chatService.getConversation('invalid-id')
      ).rejects.toThrow(ChatServiceError);
    });
  });

  describe('clearConversation', () => {
    it('should clear conversation successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Conversation cleared'
        })
      });

      const result = await chatService.clearConversation('conv-123');

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/chat/conversations/conv-123',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle network timeout', async () => {
      mockFetch.mockRejectedValueOnce(new DOMException('Timeout', 'AbortError'));

      await expect(
        chatService.sendMessage({ message: 'Test' })
      ).rejects.toThrow('Request timeout');
    });

    it('should retry on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            answer: 'Success',
            sources: [],
            conversationId: 'conv-123',
            queryType: 'hybrid'
          })
        });

      const result = await chatService.sendMessage({
        message: 'Test message'
      });

      expect(result.answer).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'));

      await expect(
        chatService.sendMessage({ message: 'Test' })
      ).rejects.toThrow(ChatServiceError);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('conversation ID persistence', () => {
    it('should maintain conversationId across multiple messages', async () => {
      const conversationId = 'conv-123';

      // First message
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          answer: 'First answer',
          sources: [],
          conversationId,
          queryType: 'semantic'
        })
      });

      const firstResult = await chatService.sendMessage({
        message: 'First message'
      });

      expect(firstResult.conversationId).toBe(conversationId);

      // Second message with same conversationId
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          answer: 'Second answer',
          sources: [],
          conversationId,
          queryType: 'hybrid'
        })
      });

      const secondResult = await chatService.sendMessage({
        message: 'Second message',
        conversationId: firstResult.conversationId
      });

      expect(secondResult.conversationId).toBe(conversationId);
    });
  });
});
