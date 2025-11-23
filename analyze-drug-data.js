#!/usr/bin/env node

import neo4j from 'neo4j-driver';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function analyzeDrugData() {
  const session = driver.session();
  
  try {
    console.log('=== Drug Data Analysis ===\n');
    
    // 1. Check current database for drug/compound nodes
    console.log('1. Checking Neo4j database for drug/compound nodes...\n');
    
    const labelsResult = await session.run(`
      CALL db.labels() YIELD label
      WHERE label =~ '(?i).*(drug|compound|chemical|molecule).*'
      RETURN label
    `);
    
    if (labelsResult.records.length > 0) {
      console.log('   Found potential drug-related labels:');
      for (const record of labelsResult.records) {
        const label = record.get('label');
        const countResult = await session.run(`MATCH (n:\`${label}\`) RETURN count(n) AS count`);
        const count = countResult.records[0].get('count').toNumber();
        console.log(`     ${label}: ${count} nodes`);
      }
    } else {
      console.log('   No drug-related labels found');
    }
    
    // Check for any nodes with drug-like properties
    console.log('\n   Checking for nodes with drug-like properties...');
    const drugPropsResult = await session.run(`
      CALL db.labels() YIELD label
      CALL {
        WITH label
        MATCH (n)
        WHERE label IN labels(n)
        WITH n LIMIT 1
        RETURN keys(n) AS props
      }
      WITH label, props
      WHERE ANY(prop IN props WHERE prop =~ '(?i).*(drug|compound|chemical|molecule|indication|mechanism).*')
      RETURN label, props
      LIMIT 10
    `);
    
    if (drugPropsResult.records.length > 0) {
      console.log('   Found nodes with drug-like properties:');
      drugPropsResult.records.forEach(record => {
        console.log(`     ${record.get('label')}: ${record.get('props').join(', ')}`);
      });
    }
    
    // 2. Analyze drug_features.csv
    console.log('\n\n2. Analyzing drug_features.csv...\n');
    
    const csvPath = '/Users/shrijeetpolke/Desktop/drug_features.csv';
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    
    console.log(`   Total rows: ${lines.length - 1}`);
    
    // Parse header
    const headers = lines[0].split(',');
    console.log(`\n   Columns (${headers.length}):`);
    headers.forEach((h, idx) => {
      console.log(`     ${idx + 1}. ${h}`);
    });
    
    // Parse first few rows to understand structure
    console.log('\n   Sample data (first 3 drugs):\n');
    
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const parts = lines[i].split(',');
      console.log(`   Drug ${i}:`);
      console.log(`     node_index: ${parts[0]}`);
      console.log(`     description: ${parts[1]?.substring(0, 100)}...`);
      
      // Try to extract drug name from description
      const desc = parts[1] || '';
      const nameMatch = desc.match(/^"?([A-Z][a-z]+)/);
      if (nameMatch) {
        console.log(`     Extracted name: ${nameMatch[1]}`);
      }
      console.log('');
    }
    
    // Parse CSV properly to get drug names
    console.log('\n3. Extracting drug names from CSV...\n');
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true
    });
    
    console.log(`   Successfully parsed ${records.length} drug records`);
    
    // Analyze drug name patterns
    const drugNames = [];
    const hasIndication = [];
    const hasMechanism = [];
    
    records.slice(0, 10).forEach((record, idx) => {
      const desc = record.description || '';
      
      // Try to extract drug name from description
      // Pattern: "DrugName is a ..." or "DrugName (marketed as..."
      const patterns = [
        /^"?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+/,
        /^"?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+\(/,
        /^"?([A-Z][a-z]+)/
      ];
      
      let drugName = null;
      for (const pattern of patterns) {
        const match = desc.match(pattern);
        if (match) {
          drugName = match[1];
          break;
        }
      }
      
      console.log(`   Drug ${idx + 1}:`);
      console.log(`     node_index: ${record.node_index}`);
      console.log(`     Extracted name: ${drugName || 'Unable to extract'}`);
      console.log(`     Has indication: ${record.indication ? 'Yes' : 'No'}`);
      console.log(`     Has mechanism: ${record.mechanism_of_action ? 'Yes' : 'No'}`);
      console.log(`     Description: ${desc.substring(0, 80)}...`);
      console.log('');
      
      if (drugName) drugNames.push(drugName);
      if (record.indication) hasIndication.push(record.node_index);
      if (record.mechanism_of_action) hasMechanism.push(record.node_index);
    });
    
    console.log(`\n   Summary:`);
    console.log(`     Drugs with extractable names: ${drugNames.length}/10`);
    console.log(`     Drugs with indication: ${hasIndication.length}/10`);
    console.log(`     Drugs with mechanism: ${hasMechanism.length}/10`);
    
    // Check for drug name field
    console.log('\n4. Checking for explicit drug name field...\n');
    const nameFields = headers.filter(h => 
      h.toLowerCase().includes('name') || 
      h.toLowerCase().includes('title') ||
      h.toLowerCase().includes('label')
    );
    
    if (nameFields.length > 0) {
      console.log(`   Found potential name fields: ${nameFields.join(', ')}`);
    } else {
      console.log('   No explicit name field found');
      console.log('   Drug names must be extracted from description field');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await session.close();
    await driver.close();
  }
}

analyzeDrugData().catch(console.error);
