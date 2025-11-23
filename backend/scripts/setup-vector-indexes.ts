/**
 * Setup Vector Indexes for Semantic Search
 * 
 * This script:
 * 1. Verifies Neo4j version is 5.26+
 * 2. Creates vector indexes for all entity types
 * 3. Tests vector index creation and basic queries
 * 
 * Requirements: 8.1, 8.2
 */

import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

interface VectorIndexConfig {
  name: string;
  label: string;
  property: string;
  dimensions: number;
  similarityFunction: string;
}

const VECTOR_INDEXES: VectorIndexConfig[] = [
  {
    name: 'drug_embeddings',
    label: 'Drug',
    property: 'embedding',
    dimensions: 1536,
    similarityFunction: 'cosine'
  },
  {
    name: 'disease_embeddings',
    label: 'Disease',
    property: 'embedding',
    dimensions: 1536,
    similarityFunction: 'cosine'
  },
  {
    name: 'clinical_disease_embeddings',
    label: 'ClinicalDisease',
    property: 'embedding',
    dimensions: 1536,
    similarityFunction: 'cosine'
  },
  {
    name: 'protein_embeddings',
    label: 'Protein',
    property: 'embedding',
    dimensions: 1536,
    similarityFunction: 'cosine'
  }
];

class VectorIndexSetup {
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
      console.log('🔍 Starting vector index setup...\n');

      // Step 1: Verify Neo4j version
      await this.verifyNeo4jVersion(session);

      // Step 2: Check vector index support
      await this.checkVectorIndexSupport(session);

      // Step 3: Create vector indexes
      await this.createVectorIndexes(session);

      // Step 4: Verify indexes were created
      await this.verifyIndexes(session);

      // Step 5: Test basic vector queries
      await this.testVectorQueries(session);

      console.log('\n✅ Vector index setup completed successfully!');
    } catch (error) {
      console.error('\n❌ Vector index setup failed:', error);
      throw error;
    } finally {
      await session.close();
      await this.driver.close();
    }
  }

  private async verifyNeo4jVersion(session: Session): Promise<void> {
    console.log('📋 Step 1: Verifying Neo4j version...');
    
    const result = await session.run(`
      CALL dbms.components() 
      YIELD name, versions, edition 
      WHERE name = 'Neo4j Kernel'
      RETURN versions[0] AS version, edition
    `);

    if (result.records.length === 0) {
      throw new Error('Could not determine Neo4j version');
    }

    const version = result.records[0].get('version');
    const edition = result.records[0].get('edition');
    
    console.log(`   Neo4j Version: ${version}`);
    console.log(`   Edition: ${edition}`);

    // Parse version (e.g., "5.26.0" -> [5, 26, 0])
    const versionParts = version.split('.').map((v: string) => parseInt(v, 10));
    const major = versionParts[0];
    const minor = versionParts[1];

    if (major < 5 || (major === 5 && minor < 26)) {
      throw new Error(
        `Neo4j version 5.26+ required for vector indexes. Current version: ${version}`
      );
    }

    console.log('   ✓ Version check passed (5.26+)\n');
  }

  private async checkVectorIndexSupport(session: Session): Promise<void> {
    console.log('📋 Step 2: Checking vector index support...');

    try {
      // Try to list existing vector indexes to verify support
      const result = await session.run(`
        SHOW INDEXES
        YIELD name, type
        WHERE type = 'VECTOR'
        RETURN count(name) AS vectorIndexCount
      `);

      const count = result.records[0].get('vectorIndexCount');
      const indexCount = neo4j.isInt(count) ? count.toNumber() : count;
      
      console.log(`   ✓ Vector index support available (${indexCount} existing indexes)\n`);
    } catch (error) {
      console.log('   ⚠ Could not verify vector index support, will attempt creation anyway\n');
    }
  }

  private async createVectorIndexes(session: Session): Promise<void> {
    console.log('📋 Step 3: Creating vector indexes...');

    for (const config of VECTOR_INDEXES) {
      try {
        console.log(`   Creating index: ${config.name}`);
        console.log(`     Label: ${config.label}`);
        console.log(`     Property: ${config.property}`);
        console.log(`     Dimensions: ${config.dimensions}`);
        console.log(`     Similarity: ${config.similarityFunction}`);

        // Drop existing index if it exists
        try {
          await session.run(`DROP INDEX ${config.name} IF EXISTS`);
        } catch (dropError) {
          // Ignore errors if index doesn't exist
        }

        // Create vector index
        const createQuery = `
          CREATE VECTOR INDEX ${config.name} IF NOT EXISTS
          FOR (n:${config.label})
          ON n.${config.property}
          OPTIONS {
            indexConfig: {
              \`vector.dimensions\`: ${config.dimensions},
              \`vector.similarity_function\`: '${config.similarityFunction}'
            }
          }
        `;

        await session.run(createQuery);
        console.log(`     ✓ Index created successfully\n`);
      } catch (error) {
        console.error(`     ✗ Failed to create index ${config.name}:`, error);
        throw error;
      }
    }
  }

  private async verifyIndexes(session: Session): Promise<void> {
    console.log('📋 Step 4: Verifying indexes...');

    const result = await session.run(`
      SHOW INDEXES
      YIELD name, type, labelsOrTypes, properties, options
      WHERE type = 'VECTOR'
      RETURN name, labelsOrTypes, properties, options
    `);

    if (result.records.length === 0) {
      throw new Error('No vector indexes found after creation');
    }

    console.log(`   Found ${result.records.length} vector indexes:\n`);

    result.records.forEach(record => {
      const name = record.get('name');
      const labels = record.get('labelsOrTypes');
      const properties = record.get('properties');
      const options = record.get('options');

      console.log(`   - ${name}`);
      console.log(`     Labels: ${labels.join(', ')}`);
      console.log(`     Properties: ${properties.join(', ')}`);
      console.log(`     Config: ${JSON.stringify(options)}`);
    });

    console.log();
  }

  private async testVectorQueries(session: Session): Promise<void> {
    console.log('📋 Step 5: Testing vector queries...');

    // Create a test embedding vector (1536 dimensions, all zeros)
    const testVector = new Array(1536).fill(0);
    testVector[0] = 1.0; // Set first dimension to 1 for testing

    for (const config of VECTOR_INDEXES) {
      try {
        console.log(`   Testing ${config.name}...`);

        // Test vector query (will return empty results if no embeddings exist yet)
        const query = `
          CALL db.index.vector.queryNodes($indexName, $k, $vector)
          YIELD node, score
          RETURN node, score
          LIMIT 1
        `;

        const result = await session.run(query, {
          indexName: config.name,
          k: neo4j.int(5),
          vector: testVector
        });

        if (result.records.length > 0) {
          console.log(`     ✓ Query successful (found ${result.records.length} results)`);
        } else {
          console.log(`     ✓ Query successful (no embeddings exist yet)`);
        }
      } catch (error) {
        console.error(`     ✗ Query failed for ${config.name}:`, error);
        throw error;
      }
    }

    console.log();
  }
}

// Run the setup
async function main() {
  const setup = new VectorIndexSetup();
  await setup.run();
}

main().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
