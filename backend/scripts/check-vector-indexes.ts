/**
 * Check Vector Index Status
 * 
 * This script checks the status of all vector indexes and provides
 * information about their configuration and readiness.
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

class VectorIndexChecker {
  private driver: Driver;

  constructor() {
    const uri = process.env.NEO4J_URI;
    const username = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !username || !password) {
      throw new Error('Missing required Neo4j environment variables');
    }

    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(username, password)
    );
  }

  async run(): Promise<void> {
    const session = this.driver.session();
    
    try {
      console.log('🔍 Checking vector index status...\n');

      await this.checkIndexes(session);
      await this.checkEntityCounts(session);
      await this.checkEmbeddingCoverage(session);

      console.log('\n✅ Vector index check completed!');
    } catch (error) {
      console.error('\n❌ Check failed:', error);
      throw error;
    } finally {
      await session.close();
      await this.driver.close();
    }
  }

  private async checkIndexes(session: Session): Promise<void> {
    console.log('📋 Vector Indexes:\n');

    const result = await session.run(`
      SHOW INDEXES
      YIELD name, type, state, labelsOrTypes, properties, options
      WHERE type = 'VECTOR'
      RETURN name, state, labelsOrTypes, properties, options
      ORDER BY name
    `);

    if (result.records.length === 0) {
      console.log('   ⚠ No vector indexes found!\n');
      return;
    }

    result.records.forEach(record => {
      const name = record.get('name');
      const state = record.get('state');
      const labels = record.get('labelsOrTypes');
      const properties = record.get('properties');
      const options = record.get('options');

      const stateIcon = state === 'ONLINE' ? '✓' : '⚠';
      
      console.log(`   ${stateIcon} ${name}`);
      console.log(`     State: ${state}`);
      console.log(`     Label: ${labels.join(', ')}`);
      console.log(`     Property: ${properties.join(', ')}`);
      
      if (options.indexConfig) {
        const config = options.indexConfig;
        const dims = config['vector.dimensions'];
        const similarity = config['vector.similarity_function'];
        console.log(`     Dimensions: ${neo4j.isInt(dims) ? dims.toNumber() : dims}`);
        console.log(`     Similarity: ${similarity}`);
      }
      console.log();
    });
  }

  private async checkEntityCounts(session: Session): Promise<void> {
    console.log('📊 Entity Counts:\n');

    const labels = ['Drug', 'Disease', 'ClinicalDisease', 'Protein'];

    for (const label of labels) {
      const result = await session.run(`
        MATCH (n:${label})
        RETURN count(n) AS total
      `);

      const total = result.records[0].get('total');
      const count = neo4j.isInt(total) ? total.toNumber() : total;
      
      console.log(`   ${label}: ${count.toLocaleString()}`);
    }

    console.log();
  }

  private async checkEmbeddingCoverage(session: Session): Promise<void> {
    console.log('📈 Embedding Coverage:\n');

    const labels = ['Drug', 'Disease', 'ClinicalDisease', 'Protein'];

    for (const label of labels) {
      const result = await session.run(`
        MATCH (n:${label})
        WITH count(n) AS total
        MATCH (n:${label})
        WHERE n.embedding IS NOT NULL
        RETURN total, count(n) AS withEmbedding
      `);

      if (result.records.length > 0) {
        const total = result.records[0].get('total');
        const withEmbedding = result.records[0].get('withEmbedding');
        
        const totalCount = neo4j.isInt(total) ? total.toNumber() : total;
        const embeddingCount = neo4j.isInt(withEmbedding) ? withEmbedding.toNumber() : withEmbedding;
        
        const percentage = totalCount > 0 
          ? ((embeddingCount / totalCount) * 100).toFixed(1)
          : '0.0';
        
        const icon = embeddingCount === totalCount ? '✓' : 
                     embeddingCount > 0 ? '⚠' : '✗';
        
        console.log(`   ${icon} ${label}: ${embeddingCount.toLocaleString()} / ${totalCount.toLocaleString()} (${percentage}%)`);
      }
    }

    console.log();
  }
}

async function main() {
  const checker = new VectorIndexChecker();
  await checker.run();
}

main().catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
});
