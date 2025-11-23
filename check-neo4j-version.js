#!/usr/bin/env node

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function checkVersion() {
  const session = driver.session();
  
  try {
    const result = await session.run('CALL dbms.components() YIELD versions RETURN versions[0] AS version');
    const version = result.records[0].get('version');
    
    console.log(`Neo4j Version: ${version}`);
    
    const [major, minor] = version.split('.').map(Number);
    
    if (major > 5 || (major === 5 && minor >= 11)) {
      console.log('✅ Vector search is supported!');
      console.log('   You can use Neo4j built-in vector indexes.');
    } else {
      console.log('⚠️  Vector search requires Neo4j 5.11+');
      console.log('   Recommendation: Use external vector DB (Pinecone/ChromaDB)');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

checkVersion().catch(console.error);
