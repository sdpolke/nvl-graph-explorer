/**
 * Generate Embeddings Script
 * 
 * This script generates embeddings for all entities in the knowledge graph
 * and stores them in Neo4j for semantic search.
 * 
 * Usage:
 *   npm run generate:embeddings                    # Generate for all entity types
 *   npm run generate:embeddings -- Drug            # Generate for specific type
 *   npm run generate:embeddings -- Protein 1000    # Generate with custom batch size
 */

import { embeddingService } from '../src/services/embeddingService';
import { neo4jProxyService } from '../src/services/neo4jService';

async function main() {
  const args = process.argv.slice(2);
  const entityType = args[0] as 'Drug' | 'Disease' | 'ClinicalDisease' | 'Protein' | undefined;
  const batchSize = args[1] ? parseInt(args[1], 10) : 100;

  console.log('='.repeat(60));
  console.log('Embedding Generation Script');
  console.log('='.repeat(60));

  if (entityType) {
    console.log(`Target: ${entityType} entities only`);
  } else {
    console.log('Target: All entity types');
  }
  console.log(`Batch size: ${batchSize}`);

  console.log('\nChecking configuration...');

  if (!embeddingService.isConfigured()) {
    console.error('❌ OpenAI API key is not configured');
    console.error('Please set OPENAI_API_KEY in your .env file');
    process.exit(1);
  }

  console.log('✓ OpenAI API key configured');

  // Connect to Neo4j
  console.log('\nConnecting to Neo4j...');
  try {
    await neo4jProxyService.connect();
    console.log('✓ Connected to Neo4j');
  } catch (error: any) {
    console.error('❌ Failed to connect to Neo4j:', error.message);
    process.exit(1);
  }

  // Estimate cost
  console.log('\nEstimating cost...');
  const estimates = await estimateCost(entityType);
  console.log('\nCost Estimate:');
  console.log(`  Total entities: ${estimates.totalEntities}`);
  console.log(`  Estimated tokens: ${estimates.estimatedTokens.toLocaleString()}`);
  console.log(`  Estimated cost: $${estimates.estimatedCost.toFixed(4)}`);
  console.log(`  Estimated time: ${Math.ceil(estimates.estimatedTime / 60)} minutes`);

  // Confirm before proceeding
  console.log('\n⚠️  This will generate embeddings and update the database.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  await sleep(5000);

  // Generate embeddings
  console.log('Starting embedding generation...\n');

  try {
    const stats = await embeddingService.generateAllEmbeddings(entityType, batchSize);

    const durationMinutes = Math.ceil(stats.duration / 60000);

    console.log('\n' + '='.repeat(60));
    console.log('Embedding Generation Complete!');
    console.log('='.repeat(60));
    console.log(`Total entities: ${stats.total}`);
    console.log(`Successfully processed: ${stats.processed}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Actual cost: $${stats.cost.toFixed(4)}`);
    console.log(`Duration: ${durationMinutes} minutes`);
    console.log('='.repeat(60));

    if (stats.failed > 0) {
      console.warn(`\n⚠️  ${stats.failed} entities failed to process. Check logs for details.`);
    }
  } catch (error: any) {
    console.error('\n❌ Embedding generation failed:', error.message);
    process.exit(1);
  } finally {
    await neo4jProxyService.disconnect();
  }
}

async function estimateCost(entityType?: string): Promise<{
  totalEntities: number;
  estimatedTokens: number;
  estimatedCost: number;
  estimatedTime: number;
}> {
  const entityTypes = entityType ? [entityType] : ['Drug', 'Disease', 'ClinicalDisease', 'Protein'];
  
  let totalEntities = 0;
  let estimatedTokens = 0;

  for (const type of entityTypes) {
    const query = `MATCH (n:\`${type}\`) RETURN count(n) AS count`;
    const result = await neo4jProxyService.executeQuery(query);
    const count = result.aggregationResults?.[0]?.count || 0;

    totalEntities += count;

    // Estimate tokens per entity based on type
    let tokensPerEntity = 100; // Default estimate
    switch (type) {
      case 'Drug':
        tokensPerEntity = 150; // Name + indication + mechanism + description + pharmacodynamics
        break;
      case 'Disease':
      case 'ClinicalDisease':
        tokensPerEntity = 200; // Name + definition + symptoms + clinical + causes
        break;
      case 'Protein':
        tokensPerEntity = 50; // Name + synonyms
        break;
    }

    estimatedTokens += count * tokensPerEntity;
  }

  // Cost: $0.02 per 1M tokens for text-embedding-3-small
  const estimatedCost = (estimatedTokens / 1_000_000) * 0.02;

  // Time: ~100 entities per minute (with rate limiting)
  const estimatedTime = (totalEntities / 100) * 60; // seconds

  return {
    totalEntities,
    estimatedTokens,
    estimatedCost,
    estimatedTime,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
