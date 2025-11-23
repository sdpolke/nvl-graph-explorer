/**
 * Test script to verify the schema fetching logic
 * Run with: npx tsx backend/test-schema-fetch.ts
 */

import { neo4jProxyService } from './src/services/neo4jService';

async function testSchemaFetch() {
  console.log('Testing schema fetch...\n');
  
  try {
    await neo4jProxyService.connect();
    console.log('✓ Connected to Neo4j\n');
    
    const schema = await neo4jProxyService.getSchema();
    
    console.log('='.repeat(80));
    console.log('SCHEMA OUTPUT:');
    console.log('='.repeat(80));
    console.log(schema.schema);
    console.log('='.repeat(80));
    
    console.log('\nNode Labels:', schema.nodeLabels.length);
    console.log('Relationship Types:', schema.relationshipTypes.length);
    
    await neo4jProxyService.disconnect();
    console.log('\n✓ Test complete');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testSchemaFetch();
