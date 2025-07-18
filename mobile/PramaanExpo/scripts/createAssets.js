// mobile/PramaanExpo/scripts/createAssets.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const assetsDir = path.join(__dirname, '..', 'assets');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple colored image
function createColoredImage(filename, color, size) {
  // Create a simple SVG as placeholder
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="${color}"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${size/4}">
    PRAMAAN
  </text>
</svg>`;
  
  fs.writeFileSync(path.join(assetsDir, filename), svg);
  console.log(`Created ${filename}`);
}

// Download or create icon
function downloadImage(url, filename) {
  const file = fs.createWriteStream(path.join(assetsDir, filename));
  
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(path.join(assetsDir, filename), () => {});
    console.error(`Error downloading ${filename}:`, err.message);
    // Create fallback
    if (filename.includes('icon')) {
      createColoredImage(filename, '#6200EA', 512);
    } else if (filename.includes('splash')) {
      createColoredImage(filename, '#6200EA', 1920);
    } else {
      createColoredImage(filename, '#6200EA', 1024);
    }
  });
}

// Create placeholder images
console.log('Creating asset files...');

// Option 1: Use online placeholders
// downloadImage('https://via.placeholder.com/512/6200EA/FFFFFF?text=P', 'icon.png');
// downloadImage('https://via.placeholder.com/1920/6200EA/FFFFFF?text=PRAMAAN', 'splash.png');
// downloadImage('https://via.placeholder.com/1024/6200EA/FFFFFF?text=P', 'adaptive-icon.png');

// Option 2: Create local SVG files (simpler)
createColoredImage('icon.svg', '#6200EA', 512);
createColoredImage('splash.svg', '#6200EA', 1920);
createColoredImage('adaptive-icon.svg', '#6200EA', 1024);

// Create PNG versions using a simple approach
const sharp = require('sharp');

async function convertSvgToPng() {
  try {
    // Convert SVGs to PNGs
    await sharp(path.join(assetsDir, 'icon.svg'))
      .resize(512, 512)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));
    
    await sharp(path.join(assetsDir, 'splash.svg'))
      .resize(1920, 1920)
      .png()
      .toFile(path.join(assetsDir, 'splash.png'));
    
    await sharp(path.join(assetsDir, 'adaptive-icon.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(assetsDir, 'adaptive-icon.png'));
    
    console.log('✓ All PNG assets created successfully!');
  } catch (error) {
    console.log('Sharp not available, creating basic placeholder files');
    
    // Create basic placeholder files
    const placeholderPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), placeholderPng);
    fs.writeFileSync(path.join(assetsDir, 'splash.png'), placeholderPng);
    fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), placeholderPng);
    
    console.log('✓ Created placeholder PNG files');
    console.log('Note: Replace these with actual images before publishing');
  }
}

// Try to convert or create placeholders
convertSvgToPng().catch(() => {
  console.log('Creating simple placeholder images...');
});