#!/usr/bin/env node

import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'password')
);

async function analyzeSemanticContent() {
  const session = driver.session();
  
  try {
    console.log('=== Semantic Content Analysis ===\n');
    
    // 1. Analyze Drug semantic content
    console.log('1. DRUG Semantic Content:\n');
    const drugSample = await session.run(`
      MATCH (d:Drug)
      WHERE d.description IS NOT NULL OR d.indication IS NOT NULL OR d.mechanism_of_action IS NOT NULL
      RETURN 
        d.name,
        d.description,
        d.indication,
        d.mechanism_of_action,
        d.pharmacodynamics
      LIMIT 3
    `);
    
    drugSample.records.forEach((r, idx) => {
      console.log(`   Drug ${idx + 1}: ${r.get('d.name')}`);
      console.log(`   Description length: ${(r.get('d.description') || '').length} chars`);
      console.log(`   Indication length: ${(r.get('d.indication') || '').length} chars`);
      console.log(`   Mechanism length: ${(r.get('d.mechanism_of_action') || '').length} chars`);
      console.log(`   Pharmacodynamics length: ${(r.get('d.pharmacodynamics') || '').length} chars`);
      console.log('');
    });
    
    const drugStats = await session.run(`
      MATCH (d:Drug)
      RETURN 
        count(d) AS total,
        count(CASE WHEN d.description IS NOT NULL AND d.description <> '' THEN 1 END) AS with_description,
        count(CASE WHEN d.indication IS NOT NULL AND d.indication <> '' THEN 1 END) AS with_indication,
        count(CASE WHEN d.mechanism_of_action IS NOT NULL AND d.mechanism_of_action <> '' THEN 1 END) AS with_mechanism,
        count(CASE WHEN d.pharmacodynamics IS NOT NULL AND d.pharmacodynamics <> '' THEN 1 END) AS with_pharmacodynamics
    `);
    
    const ds = drugStats.records[0];
    console.log(`   Total drugs: ${ds.get('total').toNumber()}`);
    console.log(`   With description: ${ds.get('with_description').toNumber()}`);
    console.log(`   With indication: ${ds.get('with_indication').toNumber()}`);
    console.log(`   With mechanism: ${ds.get('with_mechanism').toNumber()}`);
    console.log(`   With pharmacodynamics: ${ds.get('with_pharmacodynamics').toNumber()}\n`);
    
    // 2. Analyze Disease semantic content
    console.log('2. DISEASE Semantic Content:\n');
    const diseaseSample = await session.run(`
      MATCH (d:Disease)
      WHERE d.description IS NOT NULL OR d.mayo_symptoms IS NOT NULL
      RETURN 
        d.name,
        d.description,
        d.mondo_definition,
        d.mayo_symptoms,
        d.mayo_causes,
        d.orphanet_clinical_description
      LIMIT 3
    `);
    
    diseaseSample.records.forEach((r, idx) => {
      console.log(`   Disease ${idx + 1}: ${r.get('d.name')}`);
      console.log(`   Description length: ${(r.get('d.description') || '').length} chars`);
      console.log(`   MONDO definition length: ${(r.get('d.mondo_definition') || '').length} chars`);
      console.log(`   Symptoms length: ${(r.get('d.mayo_symptoms') || '').length} chars`);
      console.log(`   Causes length: ${(r.get('d.mayo_causes') || '').length} chars`);
      console.log(`   Clinical description length: ${(r.get('d.orphanet_clinical_description') || '').length} chars`);
      console.log('');
    });
    
    const diseaseStats = await session.run(`
      MATCH (d:Disease)
      RETURN 
        count(d) AS total,
        count(CASE WHEN d.description IS NOT NULL AND d.description <> '' THEN 1 END) AS with_description,
        count(CASE WHEN d.mondo_definition IS NOT NULL AND d.mondo_definition <> '' THEN 1 END) AS with_mondo_def,
        count(CASE WHEN d.mayo_symptoms IS NOT NULL AND d.mayo_symptoms <> 'No symptom information available' THEN 1 END) AS with_symptoms,
        count(CASE WHEN d.orphanet_clinical_description IS NOT NULL AND d.orphanet_clinical_description <> '' THEN 1 END) AS with_clinical
    `);
    
    const dss = diseaseStats.records[0];
    console.log(`   Total diseases: ${dss.get('total').toNumber()}`);
    console.log(`   With description: ${dss.get('with_description').toNumber()}`);
    console.log(`   With MONDO definition: ${dss.get('with_mondo_def').toNumber()}`);
    console.log(`   With symptoms: ${dss.get('with_symptoms').toNumber()}`);
    console.log(`   With clinical description: ${dss.get('with_clinical').toNumber()}\n`);
    
    // 3. Analyze ClinicalDisease semantic content
    console.log('3. CLINICAL DISEASE Semantic Content:\n');
    const clinicalStats = await session.run(`
      MATCH (cd:ClinicalDisease)
      RETURN 
        count(cd) AS total,
        count(CASE WHEN cd.mondo_definition IS NOT NULL AND cd.mondo_definition <> 'No definition available' THEN 1 END) AS with_definition,
        count(CASE WHEN cd.mayo_symptoms IS NOT NULL AND cd.mayo_symptoms <> 'No symptom information available' THEN 1 END) AS with_symptoms,
        count(CASE WHEN cd.orphanet_clinical_description IS NOT NULL AND cd.orphanet_clinical_description <> '' THEN 1 END) AS with_clinical
    `);
    
    const cs = clinicalStats.records[0];
    console.log(`   Total clinical diseases: ${cs.get('total').toNumber()}`);
    console.log(`   With definition: ${cs.get('with_definition').toNumber()}`);
    console.log(`   With symptoms: ${cs.get('with_symptoms').toNumber()}`);
    console.log(`   With clinical description: ${cs.get('with_clinical').toNumber()}\n`);
    
    // 4. Analyze Protein semantic content
    console.log('4. PROTEIN Semantic Content:\n');
    const proteinSample = await session.run(`
      MATCH (p:Protein)
      RETURN p.name, keys(p) AS properties
      LIMIT 3
    `);
    
    proteinSample.records.forEach((r, idx) => {
      console.log(`   Protein ${idx + 1}: ${r.get('p.name')}`);
      console.log(`   Properties: ${r.get('properties').join(', ')}`);
    });
    
    const proteinStats = await session.run(`
      MATCH (p:Protein)
      RETURN count(p) AS total
    `);
    console.log(`   Total proteins: ${proteinStats.records[0].get('total').toNumber()}`);
    console.log(`   Note: Proteins have limited text content (name, synonyms)\n`);
    
    // 5. Summary
    console.log('\n=== SEMANTIC RICHNESS SUMMARY ===\n');
    console.log('Rich Text Content Available:');
    console.log(`  ✓ Drugs: ${ds.get('with_description').toNumber()} descriptions, ${ds.get('with_mechanism').toNumber()} mechanisms`);
    console.log(`  ✓ Diseases: ${dss.get('with_symptoms').toNumber()} symptoms, ${dss.get('with_clinical').toNumber()} clinical descriptions`);
    console.log(`  ✓ ClinicalDiseases: ${cs.get('with_definition').toNumber()} definitions, ${cs.get('with_symptoms').toNumber()} symptoms`);
    console.log(`  ✓ Total semantic-rich entities: ~${ds.get('with_description').toNumber() + dss.get('with_symptoms').toNumber() + cs.get('with_definition').toNumber()}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

analyzeSemanticContent().catch(console.error);
