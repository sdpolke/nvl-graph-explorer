/**
 * Embedding Service
 * Handles OpenAI embedding generation for semantic search
 */

import { config } from '../config/env';
import { neo4jProxyService } from './neo4jService';

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface EmbeddingError {
  type: string;
  message: string;
  statusCode: number;
  details?: any;
}

type EntityType = 'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein';

interface DrugEntity {
  name: string;
  indication?: string;
  mechanism_of_action?: string;
  description?: string;
  pharmacodynamics?: string;
  [key: string]: any;
}

interface DiseaseEntity {
  name: string;
  mondo_definition?: string;
  description?: string;
  mayo_symptoms?: string;
  orphanet_clinical_description?: string;
  mayo_causes?: string;
  [key: string]: any;
}

interface ProteinEntity {
  id: string;
  name: string;
  synonyms?: string[];
  [key: string]: any;
}

interface EmbeddingStats {
  total: number;
  processed: number;
  failed: number;
  cost: number;
  duration: number;
}

interface BatchProgress {
  entityType: EntityType;
  current: number;
  total: number;
  percentage: number;
  estimatedCost: number;
}

export class EmbeddingService {
  private apiKey: string;
  private apiUrl = 'https://api.openai.com/v1/embeddings';
  private model = 'text-embedding-3-small';
  private dimensions = 1536;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.apiKey = config.openai.apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate embedding for single text
   * @param text - Text to embed
   * @returns 1536-dimensional embedding vector
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      throw this.createError(
        'OPENAI_NOT_CONFIGURED',
        'OpenAI API key is not configured',
        503
      );
    }

    if (!text || text.trim().length === 0) {
      throw this.createError(
        'VALIDATION_ERROR',
        'Text cannot be empty',
        400
      );
    }

    return this.embedWithRetry(text);
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Array of 1536-dimensional embedding vectors
   */
  async batchEmbed(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      throw this.createError(
        'OPENAI_NOT_CONFIGURED',
        'OpenAI API key is not configured',
        503
      );
    }

    if (!texts || texts.length === 0) {
      throw this.createError(
        'VALIDATION_ERROR',
        'Texts array cannot be empty',
        400
      );
    }

    // Filter out empty texts
    const validTexts = texts.filter(t => t && t.trim().length > 0);
    
    if (validTexts.length === 0) {
      throw this.createError(
        'VALIDATION_ERROR',
        'All texts are empty',
        400
      );
    }

    return this.batchEmbedWithRetry(validTexts);
  }

  /**
   * Embed with exponential backoff retry logic
   */
  private async embedWithRetry(text: string): Promise<number[]> {
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
            input: text,
            dimensions: this.dimensions,
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

        const data = await response.json() as EmbeddingResponse;

        if (!data.data || data.data.length === 0) {
          throw this.createError(
            'OPENAI_EMPTY_RESPONSE',
            'No embedding returned from OpenAI',
            500
          );
        }

        const embedding = data.data[0].embedding;

        // Validate embedding dimensions
        if (embedding.length !== this.dimensions) {
          throw this.createError(
            'INVALID_EMBEDDING_DIMENSIONS',
            `Expected ${this.dimensions} dimensions, got ${embedding.length}`,
            500
          );
        }

        return embedding;
      } catch (error: any) {
        lastError = error;

        // Don't retry on validation or configuration errors
        if (error.type === 'VALIDATION_ERROR' || error.type === 'OPENAI_NOT_CONFIGURED') {
          throw error;
        }

        // Don't retry on client errors (4xx except 429)
        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw this.createError(
            'OPENAI_ERROR',
            `Failed to generate embedding after ${this.maxRetries} attempts: ${error.message}`,
            500,
            { originalError: error }
          );
        }

        // Exponential backoff for other errors
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Embedding attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Batch embed with retry logic
   */
  private async batchEmbedWithRetry(texts: string[]): Promise<number[][]> {
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
            input: texts,
            dimensions: this.dimensions,
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout for batch
        });

        if (response.status === 429) {
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

        const data = await response.json() as EmbeddingResponse;

        if (!data.data || data.data.length === 0) {
          throw this.createError(
            'OPENAI_EMPTY_RESPONSE',
            'No embeddings returned from OpenAI',
            500
          );
        }

        // Sort by index to maintain order
        const sortedData = data.data.sort((a, b) => a.index - b.index);
        const embeddings = sortedData.map(item => item.embedding);

        // Validate all embeddings
        embeddings.forEach((embedding, idx) => {
          if (embedding.length !== this.dimensions) {
            throw this.createError(
              'INVALID_EMBEDDING_DIMENSIONS',
              `Embedding ${idx}: Expected ${this.dimensions} dimensions, got ${embedding.length}`,
              500
            );
          }
        });

        return embeddings;
      } catch (error: any) {
        lastError = error;

        if (error.type === 'VALIDATION_ERROR' || error.type === 'OPENAI_NOT_CONFIGURED') {
          throw error;
        }

        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw this.createError(
            'OPENAI_ERROR',
            `Failed to generate batch embeddings after ${this.maxRetries} attempts: ${error.message}`,
            500,
            { originalError: error }
          );
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`Batch embedding attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createError(type: string, message: string, statusCode: number, details?: any): EmbeddingError {
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

  /**
   * Generate composite text for entity embedding
   * Routes to appropriate text generation method based on entity type
   * 
   * @param entity - Entity object with properties
   * @param type - Entity type (Drug, Disease, ClinicalDisease, Protein)
   * @returns Composite text for embedding
   */
  generateEntityText(entity: any, type: EntityType): string {
    switch (type) {
      case 'Drug':
        return this.generateDrugText(entity as DrugEntity);
      case 'Disease':
      case 'ClinicalDisease':
        return this.generateDiseaseText(entity as DiseaseEntity);
      case 'Protein':
        return this.generateProteinText(entity as ProteinEntity);
      default:
        throw this.createError(
          'INVALID_ENTITY_TYPE',
          `Unknown entity type: ${type}`,
          400
        );
    }
  }

  /**
   * Generate composite text for Drug entities
   * Includes: name, indication, mechanism, description, pharmacodynamics
   */
  private generateDrugText(drug: DrugEntity): string {
    const parts = [
      `Drug: ${drug.name || 'Unknown'}`,
      `Indication: ${drug.indication || 'N/A'}`,
      `Mechanism: ${drug.mechanism_of_action || 'N/A'}`,
      `Description: ${drug.description || 'N/A'}`,
      `Pharmacodynamics: ${drug.pharmacodynamics || 'N/A'}`,
    ];

    return parts.join('\n').trim();
  }

  /**
   * Generate composite text for Disease/ClinicalDisease entities
   * Includes: name, definition, symptoms, clinical descriptions, causes
   */
  private generateDiseaseText(disease: DiseaseEntity): string {
    const parts = [
      `Disease: ${disease.name || 'Unknown'}`,
      `Definition: ${disease.mondo_definition || disease.description || 'N/A'}`,
      `Symptoms: ${disease.mayo_symptoms || 'N/A'}`,
      `Clinical: ${disease.orphanet_clinical_description || 'N/A'}`,
      `Causes: ${disease.mayo_causes || 'N/A'}`,
    ];

    return parts.join('\n').trim();
  }

  /**
   * Generate composite text for Protein entities
   * Includes: name, synonyms, and placeholder for relationships
   * Note: Relationships would need to be fetched from Neo4j separately
   */
  private generateProteinText(protein: ProteinEntity): string {
    // Filter out empty/whitespace-only synonyms
    const validSynonyms = protein.synonyms
      ?.map(s => s.trim())
      .filter(s => s.length > 0) || [];
    
    const synonymsText = validSynonyms.length > 0
      ? validSynonyms.join(', ')
      : 'N/A';

    const parts = [
      `Protein: ${protein.name || 'Unknown'}`,
      `Synonyms: ${synonymsText}`,
      // Note: Associated diseases and drugs would be added by the caller
      // after fetching relationships from Neo4j
    ];

    return parts.join('\n').trim();
  }

  /**
   * Generate embeddings for all entities of a specific type
   * Processes in batches with rate limiting and progress tracking
   * 
   * @param entityType - Type of entity to process (optional, processes all if not specified)
   * @param batchSize - Number of entities to process per batch (default: 100)
   * @returns Statistics about the embedding generation
   */
  async generateAllEmbeddings(
    entityType?: EntityType,
    batchSize: number = 100
  ): Promise<EmbeddingStats> {
    if (!this.isConfigured()) {
      throw this.createError(
        'OPENAI_NOT_CONFIGURED',
        'OpenAI API key is not configured',
        503
      );
    }

    const startTime = Date.now();
    const entityTypes: EntityType[] = entityType 
      ? [entityType] 
      : ['Drug', 'Disease', 'ClinicalDisease', 'Protein'];

    let totalProcessed = 0;
    let totalFailed = 0;
    let totalCost = 0;

    for (const type of entityTypes) {
      console.log(`\n=== Processing ${type} entities ===`);
      
      const stats = await this.generateEmbeddingsForType(type, batchSize);
      
      totalProcessed += stats.processed;
      totalFailed += stats.failed;
      totalCost += stats.cost;

      console.log(`✓ ${type}: ${stats.processed} processed, ${stats.failed} failed, $${stats.cost.toFixed(4)} cost`);
    }

    const duration = Date.now() - startTime;

    return {
      total: totalProcessed + totalFailed,
      processed: totalProcessed,
      failed: totalFailed,
      cost: totalCost,
      duration,
    };
  }

  /**
   * Generate embeddings for all entities of a specific type
   */
  private async generateEmbeddingsForType(
    entityType: EntityType,
    batchSize: number
  ): Promise<EmbeddingStats> {
    // Fetch all entities of this type
    const query = `MATCH (n:\`${entityType}\`) RETURN n LIMIT 100000`;
    const result = await neo4jProxyService.executeQuery(query);

    const entities = result.nodes;
    const total = entities.length;

    console.log(`Found ${total} ${entityType} entities`);

    let processed = 0;
    let failed = 0;
    let totalTokens = 0;

    // Process in batches
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, Math.min(i + batchSize, entities.length));
      
      try {
        // Generate text for each entity
        const texts = batch.map(entity => 
          this.generateEntityText(entity.properties, entityType)
        );

        // Estimate tokens (rough estimate: 1 token ≈ 4 characters)
        const batchTokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
        totalTokens += batchTokens;

        // Generate embeddings
        const embeddings = await this.batchEmbed(texts);

        // Store embeddings back to Neo4j
        await this.storeEmbeddings(batch, embeddings, entityType);

        processed += batch.length;

        // Progress update
        const progress: BatchProgress = {
          entityType,
          current: processed,
          total,
          percentage: Math.round((processed / total) * 100),
          estimatedCost: (totalTokens / 1_000_000) * 0.02, // $0.02 per 1M tokens
        };

        console.log(
          `  Progress: ${progress.current}/${progress.total} (${progress.percentage}%) - Est. cost: $${progress.estimatedCost.toFixed(4)}`
        );

        // Rate limiting: wait 1 second between batches to avoid rate limits
        if (i + batchSize < entities.length) {
          await this.sleep(1000);
        }
      } catch (error: any) {
        console.error(`  Error processing batch ${i}-${i + batch.length}:`, error.message);
        failed += batch.length;
      }
    }

    // Calculate final cost
    const cost = (totalTokens / 1_000_000) * 0.02; // $0.02 per 1M tokens for text-embedding-3-small

    return {
      total,
      processed,
      failed,
      cost,
      duration: 0, // Not tracking per-type duration
    };
  }

  /**
   * Store embeddings back to Neo4j as node properties
   */
  private async storeEmbeddings(
    entities: any[],
    embeddings: number[][],
    entityType: EntityType
  ): Promise<void> {
    if (entities.length !== embeddings.length) {
      throw this.createError(
        'EMBEDDING_MISMATCH',
        `Entity count (${entities.length}) does not match embedding count (${embeddings.length})`,
        500
      );
    }

    // Build batch update query
    const updates = entities.map((entity, idx) => ({
      id: entity.id,
      embedding: embeddings[idx],
    }));

    const query = `
      UNWIND $updates AS update
      MATCH (n:\`${entityType}\`)
      WHERE elementId(n) = update.id
      SET n.embedding = update.embedding
    `;

    await neo4jProxyService.executeQuery(query, { updates });
  }
}

export const embeddingService = new EmbeddingService();
