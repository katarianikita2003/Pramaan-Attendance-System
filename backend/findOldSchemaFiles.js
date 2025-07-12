// backend/findOldSchemaFiles.js
// This script will help locate any files that might contain the old schema

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const searchPatterns = [
  'biometricData.did',
  'biometricData: {',
  'did:',
  'oldScholarSchema',
  'biometricData.did_1'
];

const excludeDirs = ['node_modules', '.git', 'dist', 'build'];

function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    
    searchPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        // Find line numbers
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(pattern)) {
            matches.push({
              pattern,
              line: index + 1,
              content: line.trim()
            });
          }
        });
      }
    });
    
    return matches;
  } catch (error) {
    return [];
  }
}

function searchDirectory(dir, results = []) {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        const dirName = path.basename(fullPath);
        if (!excludeDirs.includes(dirName)) {
          searchDirectory(fullPath, results);
        }
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts'))) {
        const matches = searchInFile(fullPath);
        if (matches.length > 0) {
          results.push({
            file: fullPath,
            matches
          });
        }
      }
    });
  } catch (error) {
    console.error(`Error searching directory ${dir}:`, error.message);
  }
  
  return results;
}

console.log('🔍 Searching for files containing old schema patterns...\n');

const backendDir = path.join(__dirname);
const results = searchDirectory(backendDir);

if (results.length === 0) {
  console.log('✅ No files found containing the problematic patterns.');
} else {
  console.log(`❌ Found ${results.length} files containing problematic patterns:\n`);
  
  results.forEach(result => {
    console.log(`📄 File: ${result.file}`);
    result.matches.forEach(match => {
      console.log(`   Line ${match.line}: ${match.content}`);
      console.log(`   Pattern: "${match.pattern}"`);
    });
    console.log('');
  });
  
  console.log('\n⚠️  IMPORTANT: Review these files and remove/update any references to:');
  console.log('   - biometricData.did');
  console.log('   - Old Scholar schema definitions');
  console.log('   - Any index definitions on biometricData.did');
}

// Also check if there's an oldScholarSchema.js file
const oldSchemaPath = path.join(__dirname, 'src', 'models', 'oldScholarSchema.js');
if (fs.existsSync(oldSchemaPath)) {
  console.log('\n🚨 FOUND: oldScholarSchema.js exists at:', oldSchemaPath);
  console.log('   This file should be deleted or renamed to prevent auto-loading.');
}