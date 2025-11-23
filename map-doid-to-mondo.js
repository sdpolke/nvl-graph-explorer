#!/usr/bin/env node

import neo4j from 'neo4j-driver';
import fs from 'fs';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function mapDoidToMondo() {
  const session = driver.session();
  
  try {
    console.log('=== Mapping DOID to MONDO ===\n');
    
    // Read disease_features.csv
    console.log('1. Reading disease_features.csv...');
    const csvPath = '/Users/shrijeetpolke/Desktop/disease_features.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    // Parse CSV into map: lowercase_name -> mondo_data
    const mondoMap = new Map();
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Simple CSV parsing (may need enhancement for quoted fields)
      const parts = lines[i].split(',');
      if (parts.length >= 3) {
        const nodeIndex = parts[0];
        const mondoId = parts[1];
        const mondoName = parts[2];
        
        if (mondoName && mondoId) {
          const normalizedName = mondoName.toLowerCase().trim().replace(/^"|"$/g, '');
          mondoMap.set(normalizedName, {
            node_index: nodeIndex,
            mondo_id: mondoId,
            mondo_name: mondoName.replace(/^"|"$/g, '')
          });
        }
      }
    }
    
    console.log(`   Loaded ${mondoMap.size} MONDO diseases\n`);
    
    // Get diseases from Neo4j
    console.log('2. Fetching diseases from Neo4j...');
    const result = await session.run(`
      MATCH (d:Disease)
      RETURN d.id AS doid, d.name AS name, d.synonyms AS synonyms
    `);
    
    console.log(`   Fetched ${result.records.length} diseases from database\n`);
    
    // Find matches
    console.log('3. Finding matches...\n');
    const matches = [];
    const unmatchedDoid = [];
    
    for (const record of result.records) {
      const doid = record.get('doid');
      const name = record.get('name');
      const synonyms = record.get('synonyms') || [];
      
      const normalizedName = name.toLowerCase().trim();
      
      // Try exact name match
      if (mondoMap.has(normalizedName)) {
        const mondoData = mondoMap.get(normalizedName);
        matches.push({
          doid,
          name,
          mondo_id: mondoData.mondo_id,
          mondo_name: mondoData.mondo_name,
          match_type: 'exact_name'
        });
        continue;
      }
      
      // Try synonym matches
      let foundSynonymMatch = false;
      for (const syn of synonyms) {
        const normalizedSyn = syn.toLowerCase().trim();
        if (mondoMap.has(normalizedSyn)) {
          const mondoData = mondoMap.get(normalizedSyn);
          matches.push({
            doid,
            name,
            synonym: syn,
            mondo_id: mondoData.mondo_id,
            mondo_name: mondoData.mondo_name,
            match_type: 'synonym'
          });
          foundSynonymMatch = true;
          break;
        }
      }
      
      if (!foundSynonymMatch) {
        unmatchedDoid.push({ doid, name });
      }
    }
    
    // Display results
    console.log(`\n=== RESULTS ===\n`);
    console.log(`Total matches found: ${matches.length} out of ${result.records.length} (${(matches.length/result.records.length*100).toFixed(1)}%)\n`);
    
    console.log(`\n--- Exact Name Matches (${matches.filter(m => m.match_type === 'exact_name').length}) ---\n`);
    matches.filter(m => m.match_type === 'exact_name').slice(0, 20).forEach(m => {
      console.log(`${m.doid} → MONDO:${m.mondo_id}`);
      console.log(`  Name: ${m.name}`);
      console.log(`  MONDO: ${m.mondo_name}\n`);
    });
    
    console.log(`\n--- Synonym Matches (${matches.filter(m => m.match_type === 'synonym').length}) ---\n`);
    matches.filter(m => m.match_type === 'synonym').slice(0, 10).forEach(m => {
      console.log(`${m.doid} → MONDO:${m.mondo_id}`);
      console.log(`  DOID Name: ${m.name}`);
      console.log(`  Matched via synonym: ${m.synonym}`);
      console.log(`  MONDO Name: ${m.mondo_name}\n`);
    });
    
    console.log(`\n--- Unmatched (${unmatchedDoid.length}) ---\n`);
    unmatchedDoid.slice(0, 10).forEach(d => {
      console.log(`  ${d.doid}: ${d.name}`);
    });
    
    // Save mapping to CSV
    const mappingCsv = 'doid_mondo_mapping.csv';
    let csvOutput = 'doid,doid_name,mondo_id,mondo_name,match_type\n';
    matches.forEach(m => {
      csvOutput += `${m.doid},"${m.name}",${m.mondo_id},"${m.mondo_name}",${m.match_type}\n`;
    });
    
    fs.writeFileSync(mappingCsv, csvOutput);
    console.log(`\n✓ Mapping saved to ${mappingCsv}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await session.close();
    await driver.close();
  }
}

mapDoidToMondo().catch(console.error);
