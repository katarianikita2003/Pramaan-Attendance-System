// backend/scripts/verify-setup.js
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function verifySetup() {
  console.log('🔍 Verifying Pramaan setup...\n');
  
  const checks = [];
  
  // 1. Check Node.js version
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.split('.')[0].substring(1));
    checks.push({
      name: 'Node.js version',
      status: major >= 18,
      message: major >= 18 ? `✅ ${nodeVersion}` : `❌ ${nodeVersion} (requires 18+)`
    });
  } catch (e) {
    checks.push({ name: 'Node.js', status: false, message: '❌ Not found' });
  }
  
  // 2. Check MongoDB
  try {
    execSync('mongod --version', { stdio: 'ignore' });
    checks.push({ name: 'MongoDB', status: true, message: '✅ Installed' });
  } catch {
    checks.push({ name: 'MongoDB', status: false, message: '❌ Not installed' });
  }
  
  // 3. Check npm packages
  try {
    await fs.access(path.join(__dirname, '../node_modules'));
    checks.push({ name: 'NPM packages', status: true, message: '✅ Installed' });
  } catch {
    checks.push({ name: 'NPM packages', status: false, message: '❌ Run: npm install' });
  }
  
  // 4. Check .env file
  try {
    await fs.access(path.join(__dirname, '../.env'));
    checks.push({ name: 'Environment file', status: true, message: '✅ .env exists' });
  } catch {
    checks.push({ name: 'Environment file', status: false, message: '❌ Create .env from .env.example' });
  }
  
  // 5. Check directories
  const dirs = ['logs', 'certificates', 'uploads'];
  let dirsOk = true;
  for (const dir of dirs) {
    try {
      await fs.access(path.join(__dirname, '..', dir));
    } catch {
      dirsOk = false;
      break;
    }
  }
  checks.push({
    name: 'Required directories',
    status: dirsOk,
    message: dirsOk ? '✅ All directories exist' : '❌ Run: npm run setup:dev'
  });
  
  // 6. Check ZKP setup
  let zkpStatus = 'simulation';
  try {
    await fs.access(path.join(__dirname, '../src/zkp/circuits/build/biometric_auth.r1cs'));
    await fs.access(path.join(__dirname, '../src/zkp/circuits/ceremony/biometric_auth_final.zkey'));
    zkpStatus = 'real';
  } catch {
    // ZKP not set up
  }
  checks.push({
    name: 'ZKP circuits',
    status: true,
    message: zkpStatus === 'real' ? '✅ Real ZKP ready' : '⚠️  Simulation mode (optional: npm run setup:zkp)'
  });
  
  // Print results
  console.log('Setup Check Results:\n');
  checks.forEach(check => {
    const color = check.status ? colors.green : colors.red;
    console.log(`${color}${check.name}: ${check.message}${colors.reset}`);
  });
  
  const allPassed = checks.filter(c => c.status).length === checks.length;
  const critical = checks.filter(c => !c.status && c.name !== 'ZKP circuits').length === 0;
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log(`${colors.green}✅ All checks passed! Ready to run.${colors.reset}`);
  } else if (critical) {
    console.log(`${colors.yellow}⚠️  Setup complete with warnings. You can run the app.${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Setup incomplete. Fix the issues above.${colors.reset}`);
  }
  console.log('='.repeat(50));
  
  if (critical) {
    console.log('\nNext step: npm run dev');
  }
}

verifySetup().catch(console.error);