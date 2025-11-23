/**
 * Response Generator Service
 * Generates natural language responses using OpenAI with RAG pattern
 */

import { config } from '../config/env';
import { SearchResult, RankedEntity } from './hybridSearchService';

export interface ConversationContext {
  mentionedEntities: Set<string>;
  exploredRelationships: Set<string>;
  currentFocus?: string;
  lastQuery?: string;
}

export interface GeneratedResponse {
  answer: string;
  sources: Source[];
  confidence: number;
}

export type EntityType = 'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein';

export interface Source {
  entityType: EntityType;
  entityName: string;
  nodeId: string;
  relevanceScore: number;
  excerpt: string;
  properties: Record<string, any>;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatResponse {
  choices: Array<{
    message: OpenAIMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ResponseGenerator {
  private apiKey: string;
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4o-mini';
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.apiKey = config.openai.apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate natural language response from search results
   * Implements deterministic three-step RAG pipeline: retrieve → expand → generate
   */
  async generate(
    query: string,
    searchResult: SearchResult,
    conversationContext?: ConversationContext
  ): Promise<GeneratedResponse> {
    if (!this.isConfigured()) {
      throw this.createError(
        'OPENAI_NOT_CONFIGURED',
        'OpenAI API key is not configured',
        503
      );
    }

    // Log query type for analytics (RAG constraint: deterministic pipeline)
    console.log(`[RAG Pipeline] Query type: ${searchResult.queryType}, Query: "${query}"`);

    // Handle no results case (RAG constraint: no multi-step reasoning)
    if (searchResult.entities.length === 0) {
      console.log('[RAG Pipeline] No results found, returning immediately without additional API calls');
      return this.handleNoResults(query);
    }

    // Step 1: Retrieve (already done by HybridSearchService)
    // Step 2: Expand (already done by HybridSearchService)
    // Step 3: Generate (single LLM call with all context)

    // Build context text from search results
    const contextText = this.buildContextText(searchResult);

    // Build conversation history if available
    const conversationHistory = conversationContext
      ? this.buildConversationHistory(conversationContext)
      : '';

    // Call OpenAI with single LLM call (RAG pattern)
    console.log('[RAG Pipeline] Executing single LLM call with retrieved context');
    const answer = await this.callOpenAI(query, contextText, conversationHistory, searchResult.entities);

    // Extract sources from search results
    const sources = this.extractSources(searchResult);

    // Calculate confidence based on result quality
    const confidence = this.calculateConfidence(searchResult);

    return {
      answer,
      sources,
      confidence
    };
  }

  /**
   * Call OpenAI API with retry logic
   */
  private async callOpenAI(
    query: string,
    contextText: string,
    conversationHistory: string,
    entities: RankedEntity[]
  ): Promise<string> {
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: this.getSystemPrompt()
      },
      {
        role: 'user',
        content: this.buildUserPrompt(query, contextText, conversationHistory)
      }
    ];

    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: 500,
            // Explicitly disable function calling/tools (RAG constraint)
          }),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.status === 429) {
          // Rate limit - exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.warn(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw this.createError(
            'OPENAI_API_ERROR',
            this.getErrorMessage(response.status, errorData),
            response.status,
            errorData
          );
        }

        const data = await response.json() as OpenAIChatResponse;

        if (!data.choices || data.choices.length === 0) {
          throw this.createError(
            'OPENAI_EMPTY_RESPONSE',
            'No response generated from OpenAI',
            500
          );
        }

        const answer = data.choices[0].message.content;

        // Format entity mentions for highlighting
        return this.formatEntityMentions(answer, entities);
      } catch (error: any) {
        lastError = error;

        // Don't retry on configuration errors
        if (error.type === 'OPENAI_NOT_CONFIGURED') {
          throw error;
        }

        // Don't retry on client errors (4xx except 429)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw this.createError(
            'OPENAI_ERROR',
            `Failed to generate response after ${this.maxRetries} attempts: ${error.message}`,
            500,
            { originalError: error }
          );
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Response generation attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Get system prompt for biomedical assistant
   */
  private getSystemPrompt(): string {
    return `You are a biomedical knowledge assistant. Your role is to answer questions about drugs, diseases, proteins, and their relationships based on the provided context.

Guidelines:
1. Answer concisely and accurately based on the context
2. Cite specific entities when making claims
3. If the context doesn't contain enough information, say so
4. Use scientific terminology appropriately
5. Format entity names in bold (e.g., **Aspirin**)
6. Keep answers under 200 words unless more detail is requested
7. When multiple sources are available, synthesize information from all relevant sources
8. Focus on factual information from the provided context`;
  }

  /**
   * Build user prompt with context and query
   */
  private buildUserPrompt(
    query: string,
    contextText: string,
    conversationHistory: string
  ): string {
    let prompt = 'Context:\n' + contextText + '\n\n';

    if (conversationHistory) {
      prompt += conversationHistory + '\n\n';
    }

    prompt += `Question: ${query}`;

    return prompt;
  }

  /**
   * Build context text from search results
   */
  private buildContextText(searchResult: SearchResult): string {
    let context = 'Relevant entities:\n\n';

    searchResult.entities.forEach((entity, index) => {
      context += `${index + 1}. ${entity.type}: ${entity.name}\n`;

      // Include key properties based on entity type
      if (entity.type === 'Drug') {
        if (entity.properties.indication) {
          context += `   Indication: ${entity.properties.indication}\n`;
        }
        if (entity.properties.mechanism_of_action) {
          context += `   Mechanism: ${entity.properties.mechanism_of_action}\n`;
        }
        if (entity.properties.description) {
          context += `   Description: ${entity.properties.description}\n`;
        }
      } else if (entity.type === 'Disease' || entity.type === 'ClinicalDisease') {
        if (entity.properties.mondo_definition || entity.properties.description) {
          context += `   Definition: ${entity.properties.mondo_definition || entity.properties.description}\n`;
        }
        if (entity.properties.mayo_symptoms) {
          context += `   Symptoms: ${entity.properties.mayo_symptoms}\n`;
        }
      } else if (entity.type === 'Protein') {
        if (entity.properties.synonyms && entity.properties.synonyms.length > 0) {
          context += `   Synonyms: ${entity.properties.synonyms.join(', ')}\n`;
        }
      }

      context += '\n';
    });

    // Include relationships
    if (searchResult.graphData.relationships.length > 0) {
      context += '\nRelationships:\n';
      
      const relationshipTexts = new Set<string>();
      
      searchResult.graphData.relationships.forEach(rel => {
        const startNode = searchResult.graphData.nodes.find(n => n.id === rel.startNodeId);
        const endNode = searchResult.graphData.nodes.find(n => n.id === rel.endNodeId);

        if (startNode && endNode) {
          const relText = `- ${startNode.properties.name} -[${rel.type}]-> ${endNode.properties.name}`;
          relationshipTexts.add(relText);
        }
      });

      relationshipTexts.forEach(text => {
        context += text + '\n';
      });
    }

    return context;
  }

  /**
   * Build conversation history text
   */
  private buildConversationHistory(context: ConversationContext): string {
    if (!context.lastQuery) {
      return '';
    }

    let history = 'Previous conversation:\n';
    history += `Last question: ${context.lastQuery}\n`;

    if (context.mentionedEntities.size > 0) {
      history += `Previously mentioned entities: ${Array.from(context.mentionedEntities).join(', ')}\n`;
    }

    return history;
  }

  /**
   * Format entity mentions for highlighting
   * Wraps entity names in bold markdown
   */
  private formatEntityMentions(answer: string, entities: RankedEntity[]): string {
    let formatted = answer;

    // Sort entities by name length (longest first) to avoid partial matches
    const sortedEntities = [...entities].sort((a, b) => b.name.length - a.name.length);

    sortedEntities.forEach(entity => {
      // Create regex to match entity name (case-insensitive, word boundaries)
      const regex = new RegExp(`\\b(${this.escapeRegex(entity.name)})\\b`, 'gi');
      
      // Replace with bold markdown if not already bold
      formatted = formatted.replace(regex, (match) => {
        // Don't double-bold
        if (formatted.includes(`**${match}**`)) {
          return match;
        }
        return `**${match}**`;
      });
    });

    return formatted;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract and format sources from search results
   */
  private extractSources(result: SearchResult): Source[] {
    const sources: Source[] = [];

    result.entities.forEach(entity => {
      const excerpt = this.generateExcerpt(entity);

      sources.push({
        entityType: entity.type,
        entityName: entity.name,
        nodeId: entity.id,
        relevanceScore: entity.relevanceScore,
        excerpt,
        properties: entity.properties
      });
    });

    // Sort by relevance score (descending)
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return sources;
  }

  /**
   * Generate relevant excerpt from entity properties
   */
  private generateExcerpt(entity: RankedEntity): string {
    const excerpts: string[] = [];

    if (entity.type === 'Drug') {
      // Only include non-empty, meaningful strings
      if (entity.properties.indication && entity.properties.indication.trim().length > 0) {
        excerpts.push(entity.properties.indication.trim());
      }
      if (entity.properties.mechanism_of_action && entity.properties.mechanism_of_action.trim().length > 0) {
        excerpts.push(entity.properties.mechanism_of_action.trim());
      }
    } else if (entity.type === 'Disease' || entity.type === 'ClinicalDisease') {
      if (entity.properties.mondo_definition && entity.properties.mondo_definition.trim().length > 0) {
        excerpts.push(entity.properties.mondo_definition.trim());
      } else if (entity.properties.description && entity.properties.description.trim().length > 0) {
        excerpts.push(entity.properties.description.trim());
      }
    } else if (entity.type === 'Protein') {
      if (entity.properties.synonyms && entity.properties.synonyms.length > 0) {
        const validSynonyms = entity.properties.synonyms
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0);
        if (validSynonyms.length > 0) {
          excerpts.push(`Also known as: ${validSynonyms.slice(0, 3).join(', ')}`);
        }
      }
    }

    // Truncate to reasonable length
    const excerpt = excerpts.join('. ');
    if (excerpt.length > 200) {
      return excerpt.substring(0, 197) + '...';
    }

    return excerpt || 'No description available';
  }

  /**
   * Calculate confidence score based on result quality
   */
  private calculateConfidence(searchResult: SearchResult): number {
    if (searchResult.entities.length === 0) {
      return 0;
    }

    // Base confidence on top result's relevance score
    const topScore = searchResult.entities[0].relevanceScore;

    // Boost confidence if multiple high-quality results
    const highQualityCount = searchResult.entities.filter(e => e.relevanceScore > 0.7).length;
    const boost = Math.min(highQualityCount * 0.05, 0.2);

    // Boost confidence if graph relationships are present
    const graphBoost = searchResult.graphData.relationships.length > 0 ? 0.1 : 0;

    const confidence = Math.min(topScore + boost + graphBoost, 1.0);

    return Math.round(confidence * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Handle no results case
   */
  private handleNoResults(query: string): GeneratedResponse {
    return {
      answer: `I couldn't find any entities matching "${query}". Try:
- Using different keywords
- Checking spelling
- Asking about drugs, diseases, or proteins
- Being more specific (e.g., "diabetes drugs" instead of "diabetes")`,
      sources: [],
      confidence: 0
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createError(type: string, message: string, statusCode: number, details?: any): any {
    return { type, message, statusCode, details };
  }

  private getErrorMessage(status: number, errorData: any): string {
    switch (status) {
      case 401:
        return 'Invalid OpenAI API key';
      case 429:
        return 'OpenAI API rate limit exceeded';
      case 500:
      case 502:
      case 503:
        return 'OpenAI service temporarily unavailable';
      case 400:
        return errorData?.error?.message
          ? `Invalid request: ${errorData.error.message}`
          : 'Invalid request to OpenAI API';
      default:
        return errorData?.error?.message
          ? `OpenAI API error: ${errorData.error.message}`
          : `OpenAI API error (status ${status})`;
    }
  }
}

export const responseGenerator = new ResponseGenerator();
