// backend/removeProblematicFiles.js
// This script will safely handle the problematic files

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing problematic files...\n');

// Files to handle
const problematicFiles = [
  'createDummyScholar.js',
  'fixDatabase.js',
  'removeDIDIndex.js'
];

problematicFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    console.log(`📄 Found: ${file}`);
    
    // Rename the file instead of deleting (safer)
    const backupPath = path.join(__dirname, 'old_scripts', `OLD_${file}`);
    
    // Create old_scripts directory if it doesn't exist
    const oldScriptsDir = path.join(__dirname, 'old_scripts');
    if (!fs.existsSync(oldScriptsDir)) {
      fs.mkdirSync(oldScriptsDir, { recursive: true });
    }
    
    try {
      fs.renameSync(filePath, backupPath);
      console.log(`   ✅ Moved to: old_scripts/OLD_${file}`);
    } catch (error) {
      console.log(`   ❌ Error moving file: ${error.message}`);
    }
  } else {
    console.log(`   ℹ️  ${file} not found (already removed?)`);
  }
});

console.log('\n✅ Cleanup complete!');
console.log('\n📋 Next steps:');
console.log('1. The problematic files have been moved to the old_scripts folder');
console.log('2. Now restart your backend server');
console.log('3. Try adding a scholar again - it should work now!');