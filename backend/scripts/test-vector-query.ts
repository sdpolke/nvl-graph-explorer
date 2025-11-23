/**
 * Test Vector Query Functionality
 * 
 * This script tests basic vector query operations to ensure
 * the vector indexes are working correctly.
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

class VectorQueryTester {
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
      console.log('🧪 Testing vector query functionality...\n');

      await this.testVectorQuerySyntax(session);
      await this.testVectorQueryWithFiltering(session);
      await this.testVectorQueryPerformance(session);

      console.log('\n✅ All vector query tests passed!');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      throw error;
    } finally {
      await session.close();
      await this.driver.close();
    }
  }

  private async testVectorQuerySyntax(session: Session): Promise<void> {
    console.log('📋 Test 1: Vector query syntax\n');

    const indexes = [
      { name: 'drug_embeddings', label: 'Drug' },
      { name: 'disease_embeddings', label: 'Disease' },
      { name: 'clinical_disease_embeddings', label: 'ClinicalDisease' },
      { name: 'protein_embeddings', label: 'Protein' }
    ];

    // Create a test vector (1536 dimensions)
    const testVector = new Array(1536).fill(0);
    testVector[0] = 1.0;
    testVector[1] = 0.5;
    testVector[2] = 0.25;

    for (const index of indexes) {
      try {
        const query = `
          CALL db.index.vector.queryNodes($indexName, $k, $vector)
          YIELD node, score
          RETURN node.name AS name, score
          LIMIT 3
        `;

        const result = await session.run(query, {
          indexName: index.name,
          k: neo4j.int(5),
          vector: testVector
        });

        console.log(`   ✓ ${index.name}: Query executed successfully`);
        
        if (result.records.length > 0) {
          console.log(`     Found ${result.records.length} results (embeddings exist)`);
          result.records.forEach((record, i) => {
            const name = record.get('name');
            const score = record.get('score');
            console.log(`       ${i + 1}. ${name} (score: ${score.toFixed(4)})`);
          });
        } else {
          console.log(`     No results (no embeddings exist yet)`);
        }
        console.log();
      } catch (error) {
        console.error(`   ✗ ${index.name}: Query failed`);
        throw error;
      }
    }
  }

  private async testVectorQueryWithFiltering(session: Session): Promise<void> {
    console.log('📋 Test 2: Vector query with property filtering\n');

    const testVector = new Array(1536).fill(0);
    testVector[0] = 1.0;

    try {
      // Test combining vector search with WHERE clause
      const query = `
        CALL db.index.vector.queryNodes('drug_embeddings', $k, $vector)
        YIELD node, score
        WHERE node.name IS NOT NULL
        RETURN node.name AS name, score
        LIMIT 3
      `;

      const result = await session.run(query, {
        k: neo4j.int(10),
        vector: testVector
      });

      console.log(`   ✓ Vector query with filtering executed successfully`);
      console.log(`     Results: ${result.records.length}`);
      console.log();
    } catch (error) {
      console.error(`   ✗ Vector query with filtering failed`);
      throw error;
    }
  }

  private async testVectorQueryPerformance(session: Session): Promise<void> {
    console.log('📋 Test 3: Vector query performance\n');

    const testVector = new Array(1536).fill(0);
    for (let i = 0; i < 1536; i++) {
      testVector[i] = Math.random();
    }

    const indexes = [
      { name: 'drug_embeddings', label: 'Drug', target: 500 },
      { name: 'disease_embeddings', label: 'Disease', target: 500 },
      { name: 'clinical_disease_embeddings', label: 'ClinicalDisease', target: 500 }
    ];

    for (const index of indexes) {
      try {
        const startTime = Date.now();

        const query = `
          CALL db.index.vector.queryNodes($indexName, $k, $vector)
          YIELD node, score
          RETURN count(node) AS resultCount
        `;

        const result = await session.run(query, {
          indexName: index.name,
          k: neo4j.int(10),
          vector: testVector
        });

        const duration = Date.now() - startTime;
        const resultCount = result.records[0]?.get('resultCount');
        const count = neo4j.isInt(resultCount) ? resultCount.toNumber() : resultCount;

        const icon = duration < index.target ? '✓' : '⚠';
        const status = duration < index.target ? 'PASS' : 'SLOW';

        console.log(`   ${icon} ${index.label}: ${duration}ms (${status}, target: <${index.target}ms)`);
        console.log(`     Results: ${count}`);
      } catch (error) {
        console.error(`   ✗ ${index.label}: Performance test failed`);
        throw error;
      }
    }

    console.log();
  }
}

async function main() {
  const tester = new VectorQueryTester();
  await tester.run();
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
