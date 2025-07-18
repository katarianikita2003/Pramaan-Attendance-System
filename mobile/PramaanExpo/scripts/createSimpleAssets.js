// mobile/PramaanExpo/scripts/createSimpleAssets.js
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple 1x1 purple PNG
const purplePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

// Create placeholder images
console.log('Creating placeholder images...');

// Create the same image for all required assets
const files = ['icon.png', 'splash.png', 'adaptive-icon.png'];

files.forEach(filename => {
  const filepath = path.join(assetsDir, filename);
  fs.writeFileSync(filepath, purplePng);
  console.log(`✓ Created ${filename}`);
});

console.log('\nPlaceholder images created successfully!');
console.log('Note: Replace these with actual images before publishing.');