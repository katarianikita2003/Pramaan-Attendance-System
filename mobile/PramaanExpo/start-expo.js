// start-expo.js
const { exec } = require('child_process');

console.log('Starting Expo in Go mode...');

const command = 'npx expo start --go --clear';

const expo = exec(command);

expo.stdout.on('data', (data) => {
  console.log(data.toString());
});

expo.stderr.on('data', (data) => {
  console.error(data.toString());
});

// After 10 seconds, try to open on Android
setTimeout(() => {
  console.log('\nAttempting to open on Android...');
  exec('npx expo start --android', (error) => {
    if (error) {
      console.log('Could not auto-open on Android. Please press "a" manually.');
    }
  });
}, 10000);