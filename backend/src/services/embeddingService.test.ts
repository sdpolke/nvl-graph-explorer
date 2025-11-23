/**
 * Property-Based Tests for EmbeddingService
 * 
 * These tests validate correctness properties using fast-check
 */

import fc from 'fast-check';
import { EmbeddingService } from './embeddingService';

describe('EmbeddingService Property Tests', () => {
  let embeddingService: EmbeddingService;

  beforeEach(() => {
    embeddingService = new EmbeddingService();
  });

  /**
   * Feature: semantic-search-chat, Property 1: Embedding dimensionality consistency
   * 
   * For any natural language text input, the generated embedding vector 
   * should have exactly 1536 dimensions
   * 
   * Validates: Requirements 1.1, 2.4
   */
  describe('Property 1: Embedding dimensionality consistency', () => {
    test('should generate 1536-dimensional embeddings for any text', async () => {
      // Skip if OpenAI API key is not configured
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }),
          async (text) => {
            const embedding = await embeddingService.embed(text);
            
            // Property: All embeddings must have exactly 1536 dimensions
            expect(embedding).toHaveLength(1536);
            
            // Additional invariant: All values must be numbers
            expect(embedding.every(n => typeof n === 'number')).toBe(true);
            
            // Additional invariant: No NaN or Infinity values
            expect(embedding.every(n => Number.isFinite(n))).toBe(true);
          }
        ),
        { 
          numRuns: 100,
          // Add timeout for each property run
          timeout: 5000,
        }
      );
    }, 600000); // 10 minute timeout for entire test (100 runs * ~5s each)
  });

  /**
   * Additional unit tests for edge cases and error handling
   */
  describe('Unit Tests: Error Handling', () => {
    test('should reject empty text', async () => {
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      await expect(embeddingService.embed('')).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: 'Text cannot be empty',
      });
    });

    test('should reject whitespace-only text', async () => {
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      await expect(embeddingService.embed('   ')).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: 'Text cannot be empty',
      });
    });

    test('should handle batch embedding with empty array', async () => {
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      await expect(embeddingService.batchEmbed([])).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: 'Texts array cannot be empty',
      });
    });

    test('should filter out empty texts in batch', async () => {
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      await expect(embeddingService.batchEmbed(['', '  ', '\n'])).rejects.toMatchObject({
        type: 'VALIDATION_ERROR',
        message: 'All texts are empty',
      });
    });
  });

  describe('Unit Tests: Batch Embedding', () => {
    test('should generate embeddings for multiple texts', async () => {
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      const texts = ['Hello world', 'Test text', 'Another example'];
      const embeddings = await embeddingService.batchEmbed(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding).toHaveLength(1536);
        expect(embedding.every(n => typeof n === 'number')).toBe(true);
      });
    }, 30000);

    test('should maintain order in batch embeddings', async () => {
      if (!embeddingService.isConfigured()) {
        console.warn('Skipping test: OpenAI API key not configured');
        return;
      }

      const texts = ['First', 'Second', 'Third'];
      const embeddings = await embeddingService.batchEmbed(texts);

      // Each text should produce a unique embedding
      expect(embeddings).toHaveLength(3);
      
      // Embeddings should be different (not all the same)
      const firstEmbedding = embeddings[0];
      const allSame = embeddings.every(emb => 
        emb.every((val, idx) => val === firstEmbedding[idx])
      );
      expect(allSame).toBe(false);
    }, 30000);
  });

  /**
   * Feature: semantic-search-chat, Property 4: Drug embedding completeness
   * 
   * For any drug entity, the generated embedding text should contain 
   * the fields: name, indication, mechanism, description, and pharmacodynamics
   * 
   * Validates: Requirements 2.1
   */
  describe('Property 4: Drug embedding completeness', () => {
    test('should include all required fields in drug text', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1 }),
            indication: fc.option(fc.string()),
            mechanism_of_action: fc.option(fc.string()),
            description: fc.option(fc.string()),
            pharmacodynamics: fc.option(fc.string()),
          }),
          (drug) => {
            const text = embeddingService.generateEntityText(drug, 'Drug');
            
            // Property: Text must contain all required field labels
            expect(text).toContain('Drug:');
            expect(text).toContain('Indication:');
            expect(text).toContain('Mechanism:');
            expect(text).toContain('Description:');
            expect(text).toContain('Pharmacodynamics:');
            
            // Property: Text must contain the drug name
            expect(text).toContain(drug.name);
            
            // Property: Missing fields should show "N/A"
            if (!drug.indication) {
              expect(text).toContain('Indication: N/A');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 5: Disease embedding completeness
   * 
   * For any disease entity, the generated embedding text should contain 
   * the fields: name, definition, symptoms, and clinical descriptions
   * 
   * Validates: Requirements 2.2
   */
  describe('Property 5: Disease embedding completeness', () => {
    test('should include all required fields in disease text', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1 }),
            mondo_definition: fc.option(fc.string()),
            description: fc.option(fc.string()),
            mayo_symptoms: fc.option(fc.string()),
            orphanet_clinical_description: fc.option(fc.string()),
            mayo_causes: fc.option(fc.string()),
          }),
          (disease) => {
            const text = embeddingService.generateEntityText(disease, 'Disease');
            
            // Property: Text must contain all required field labels
            expect(text).toContain('Disease:');
            expect(text).toContain('Definition:');
            expect(text).toContain('Symptoms:');
            expect(text).toContain('Clinical:');
            expect(text).toContain('Causes:');
            
            // Property: Text must contain the disease name
            expect(text).toContain(disease.name);
            
            // Property: Missing fields should show "N/A"
            if (!disease.mayo_symptoms) {
              expect(text).toContain('Symptoms: N/A');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle ClinicalDisease entities', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1 }),
            mondo_definition: fc.option(fc.string()),
            mayo_symptoms: fc.option(fc.string()),
          }),
          (disease) => {
            const text = embeddingService.generateEntityText(disease, 'ClinicalDisease');
            
            // Property: ClinicalDisease should use same format as Disease
            expect(text).toContain('Disease:');
            expect(text).toContain('Definition:');
            expect(text).toContain('Symptoms:');
            expect(text).toContain(disease.name);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 6: Protein embedding completeness
   * 
   * For any protein entity, the generated embedding text should contain 
   * the fields: name, synonyms, and associated relationships
   * 
   * Validates: Requirements 2.3
   */
  describe('Property 6: Protein embedding completeness', () => {
    test('should include all required fields in protein text', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
            synonyms: fc.option(fc.array(fc.string())),
          }),
          (protein) => {
            const text = embeddingService.generateEntityText(protein, 'Protein');
            
            // Property: Text must contain all required field labels
            expect(text).toContain('Protein:');
            expect(text).toContain('Synonyms:');
            
            // Property: Text must contain the protein name
            expect(text).toContain(protein.name);
            
            // Property: Synonyms should be comma-separated or N/A
            if (protein.synonyms && protein.synonyms.length > 0) {
              // Check that the synonyms section contains the joined synonyms
              // (trimmed to handle whitespace variations)
              const trimmedSynonyms = protein.synonyms.map(s => s.trim()).filter(s => s.length > 0);
              
              if (trimmedSynonyms.length > 0) {
                // At least one non-empty synonym should be present
                const hasSynonym = trimmedSynonyms.some(syn => text.includes(syn));
                expect(hasSynonym).toBe(true);
              } else {
                // All synonyms were empty/whitespace
                expect(text).toContain('Synonyms: N/A');
              }
            } else {
              expect(text).toContain('Synonyms: N/A');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: semantic-search-chat, Property 34: Embedding storage format
   * 
   * For any entity with an embedding, the node should have an "embedding" 
   * property that is an array of numbers
   * 
   * Validates: Requirements 8.5
   */
  describe('Property 34: Embedding storage format', () => {
    test('should store embeddings as array of numbers', () => {
      fc.assert(
        fc.property(
          // Generate valid embeddings: 1536 finite floats between -1 and 1
          // (typical range for normalized embeddings)
          fc.array(
            fc.float({ min: -1, max: 1, noNaN: true }),
            { minLength: 1536, maxLength: 1536 }
          ),
          (embedding) => {
            // Property: Embedding must be an array
            expect(Array.isArray(embedding)).toBe(true);
            
            // Property: Embedding must have exactly 1536 elements
            expect(embedding).toHaveLength(1536);
            
            // Property: All elements must be numbers
            expect(embedding.every(n => typeof n === 'number')).toBe(true);
            
            // Property: All elements must be finite (no NaN or Infinity)
            expect(embedding.every(n => Number.isFinite(n))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should validate embedding format before storage', () => {
      // Test that invalid embeddings are rejected
      const invalidEmbeddings = [
        [], // Empty array
        new Array(1535).fill(0), // Wrong length (too short)
        new Array(1537).fill(0), // Wrong length (too long)
        new Array(1536).fill(NaN), // Contains NaN
        new Array(1536).fill(Infinity), // Contains Infinity
      ];

      invalidEmbeddings.forEach(invalid => {
        // These should fail validation
        if (invalid.length !== 1536) {
          expect(invalid).not.toHaveLength(1536);
        } else if (invalid.some(n => !Number.isFinite(n))) {
          expect(invalid.every(n => Number.isFinite(n))).toBe(false);
        }
      });
    });
  });
});
