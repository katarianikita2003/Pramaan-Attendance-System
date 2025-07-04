// ===== backend/scripts/setup-dev.js =====
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDevelopment() {
  console.log('🚀 Setting up Pramaan development environment...\n');

  try {
    // 1. Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion < 18) {
      throw new Error(`Node.js 18+ required. Current version: ${nodeVersion}`);
    }
    console.log(`✅ Node.js ${nodeVersion}`);

    // 2. Check MongoDB
    try {
      execSync('mongod --version', { stdio: 'ignore' });
      console.log('✅ MongoDB installed');
    } catch {
      console.log('❌ MongoDB not found. Please install MongoDB 5.0+');
      console.log('   Visit: https://www.mongodb.com/try/download/community');
    }

    // 3. Create directories
    const dirs = [
      '../logs',
      '../certificates',
      '../uploads',
      '../src/zkp/circuits/build',
      '../src/zkp/circuits/ceremony'
    ];

    for (const dir of dirs) {
      await fs.mkdir(path.join(__dirname, dir), { recursive: true });
    }
    console.log('✅ Created directories');

    // 4. Copy environment file
    const envPath = path.join(__dirname, '../.env');
    const envExamplePath = path.join(__dirname, '../.env.example');
    
    try {
      await fs.access(envPath);
      console.log('✅ .env file exists');
    } catch {
      await fs.copyFile(envExamplePath, envPath);
      console.log('✅ Created .env file from .env.example');
      console.log('⚠️  Please update .env with your configuration');
    }

    // 5. Install dependencies
    console.log('\n📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    // 6. Check Circom
    try {
      execSync('circom --version', { stdio: 'ignore' });
      console.log('\n✅ Circom installed');
      
      // Compile circuits
      console.log('🔧 Compiling ZKP circuits...');
      execSync('npm run setup:zkp', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch {
      console.log('\n⚠️  Circom not found. ZKP will run in simulation mode.');
      console.log('   To use real ZKP, install Circom 2.0+');
      console.log('   Visit: https://docs.circom.io/getting-started/installation/');
    }

    // 7. Generate random keys
    const crypto = await import('crypto');
    const jwtSecret = crypto.randomBytes(64).toString('hex');
    const encryptionKey = crypto.randomBytes(32).toString('hex');

    console.log('\n🔐 Generated security keys:');
    console.log(`   JWT_SECRET=${jwtSecret}`);
    console.log(`   BIOMETRIC_ENCRYPTION_KEY=${encryptionKey}`);
    console.log('   Add these to your .env file');

    console.log('\n✨ Development setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update .env file with your configuration');
    console.log('   2. Start MongoDB: mongod');
    console.log('   3. Run server: npm run dev');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDevelopment();
