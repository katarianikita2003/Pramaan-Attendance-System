import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = [
  {
    name: 'tiny_face_detector_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json'
  },
  {
    name: 'tiny_face_detector_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1'
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1'
  },
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json'
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1'
  },
  {
    name: 'face_recognition_model-shard2',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        file.close();
        fs.unlinkSync(dest);
        https.get(response.headers.location, (redirectResponse) => {
          const newFile = fs.createWriteStream(dest);
          redirectResponse.pipe(newFile);
          newFile.on('finish', () => {
            newFile.close();
            resolve();
          });
        });
      } else {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('Downloading face-api.js models from CDN...\n');
  
  // First, delete existing 0-byte files
  for (const model of models) {
    const filePath = path.join(__dirname, model.name);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deleted empty file: ${model.name}`);
      }
    }
  }
  
  console.log('\nDownloading fresh models...\n');
  
  for (const model of models) {
    try {
      console.log(`⏬ Downloading ${model.name}...`);
      await downloadFile(model.url, path.join(__dirname, model.name));
      
      // Verify file size
      const stats = fs.statSync(path.join(__dirname, model.name));
      if (stats.size > 0) {
        console.log(`✅ Downloaded ${model.name} (${stats.size} bytes)`);
      } else {
        console.log(`❌ Failed to download ${model.name} - file is empty`);
      }
    } catch (error) {
      console.error(`❌ Error downloading ${model.name}:`, error.message);
    }
  }
  
  console.log('\nDone!');
}

downloadModels();