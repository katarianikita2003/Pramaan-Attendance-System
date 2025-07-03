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
    url: 'https://github.com/justadudewhohacks/face-api.js/blob/master/weights/tiny_face_detector_model-shard1?raw=true',
    binary: true
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json'
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/blob/master/weights/face_landmark_68_model-shard1?raw=true',
    binary: true
  },
  {
    name: 'face_recognition_model-weights_manifest.json',
    url: 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json'
  },
  {
    name: 'face_recognition_model-shard1',
    url: 'https://github.com/justadudewhohacks/face-api.js/blob/master/weights/face_recognition_model-shard1?raw=true',
    binary: true
  },
  {
    name: 'face_recognition_model-shard2',
    url: 'https://github.com/justadudewhohacks/face-api.js/blob/master/weights/face_recognition_model-shard2?raw=true',
    binary: true
  }
];

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function downloadModels() {
  console.log('Downloading face-api.js models...');
  for (const model of models) {
    try {
      await downloadFile(model.url, path.join(__dirname, model.name));
      console.log(`✅ Downloaded ${model.name}`);
    } catch (error) {
      console.error(`❌ Error downloading ${model.name}:`, error.message);
    }
  }
  console.log('Done!');
}

downloadModels();