#!/usr/bin/env node

/**
 * Analyze the new disease_features.csv structure
 */

import fs from 'fs';

const csvPath = '/Users/shrijeetpolke/Desktop/disease_features.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');
const headers = lines[0].split(',');

console.log('=== New Disease Data Structure ===\n');
console.log('Total columns:', headers.length);
console.log('\nColumn names:');
headers.forEach((h, idx) => console.log(`  ${idx + 1}. ${h}`));

console.log('\n\nSample data (first non-header row):');
const firstDataRow = lines[1].split(',');
headers.forEach((h, idx) => {
  const value = firstDataRow[idx] || '';
  const display = value.length > 80 ? value.substring(0, 80) + '...' : value;
  if (display) {
    console.log(`  ${h}: ${display}`);
  }
});

console.log('\n\nTotal rows:', lines.length - 1);
