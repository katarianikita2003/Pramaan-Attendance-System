// metro-start.js
const { exec } = require('child_process');
const path = require('path');

console.log('Starting Metro bundler directly...');

// Start Metro bundler
const metro = exec('npx react-native start --reset-cache', {
  cwd: __dirname
});

metro.stdout.on('data', (data) => {
  console.log(data.toString());
});

metro.stderr.on('data', (data) => {
  if (!data.toString().includes('warning')) {
    console.error(data.toString());
  }
});

// Give Metro time to start, then open the app
setTimeout(() => {
  console.log('\nOpening app on Android...');
  
  // Try to open the app using adb
  exec('adb shell monkey -p com.pramaan.expo -c android.intent.category.LAUNCHER 1', (error, stdout, stderr) => {
    if (error) {
      console.log('Trying alternative method...');
      // Try opening with Expo Go
      exec('adb shell am start -a android.intent.action.VIEW -d exp://localhost:8081', (err) => {
        if (err) {
          console.log('\nPlease open Expo Go manually and enter: exp://10.13.117.32:8081');
        }
      });
    }
  });
}, 5000);