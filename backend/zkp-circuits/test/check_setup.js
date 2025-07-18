const fs = require('fs');
const path = require('path');

console.log('Testing ZKP Development Setup...');

// Check if files exist
const files = [
    '../build/biometric_attendance_js/biometric_attendance.wasm',
    '../keys/biometric_final.zkey',
    '../keys/verification_key.json'
];

let allFilesExist = true;
files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`âœ“ ${file} exists`);
    } else {
        console.log(`âœ— ${file} missing`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('\nâœ… All ZKP files are in place!');
    console.log('The backend can now run in production-dev mode.');
} else {
    console.log('\nâŒ Some files are missing.');
}
