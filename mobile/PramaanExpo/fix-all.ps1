# COMPLETE FIX SCRIPT FOR PRAMAAN
# Run this PowerShell script to fix all issues at once

Write-Host "Fixing Pramaan Application..." -ForegroundColor Yellow

# 1. Fix Backend Admin Passwords
Write-Host "`n1. Fixing Admin Passwords in MongoDB..." -ForegroundColor Cyan

$mongoFixScript = @'
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb://localhost:27017/pramaan_zkp_attendance').then(async () => {
  const adminSchema = new mongoose.Schema({
    email: String,
    password: String,
    passwordHash: String,
    name: String,
    organizationId: mongoose.Schema.Types.ObjectId
  }, { strict: false });
  
  const Admin = mongoose.model('Admin', adminSchema);
  
  const defaultPasswords = {
    'admin1@gmail.com': 'Admin111',
    'admin2@gmail.com': 'Admin222',
    'admin3@gmail.com': 'Admin333',
    'admin4@gmail.com': 'Admin444',
    'admin5@gmail.com': 'Admin555'
  };
  
  const admins = await Admin.find({});
  
  for (const admin of admins) {
    const plainPassword = defaultPasswords[admin.email] || 'Admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    await Admin.updateOne(
      { _id: admin._id },
      { 
        $set: { password: hashedPassword },
        $unset: { passwordHash: "" }
      }
    );
    
    console.log(`Updated ${admin.email} - Password: ${plainPassword}`);
  }
  
  console.log('All admins updated!');
  process.exit(0);
});
'@

# Save and run the MongoDB fix
$mongoFixScript | Out-File -FilePath "D:\Pramaan - Attendance - System\Pramaan-Attendance-System\backend\fix-passwords.js" -Encoding UTF8
cd "D:\Pramaan - Attendance - System\Pramaan-Attendance-System\backend"
node fix-passwords.js

# 2. Fix Icon Names in Mobile App
Write-Host "`n2. Fixing Icon Names..." -ForegroundColor Cyan

$iconReplacements = @{
    '"my-location"' = '"crosshairs-gps"'
    '"location-on"' = '"map-marker"'
    '"analytics"' = '"chart-line"'
}

$mobileDir = "D:\Pramaan - Attendance - System\Pramaan-Attendance-System\mobile\PramaanExpo"

Get-ChildItem -Path $mobileDir -Include *.js,*.jsx,*.ts,*.tsx -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $modified = $false
    
    foreach ($old in $iconReplacements.Keys) {
        if ($content -match $old) {
            $content = $content -replace $old, $iconReplacements[$old]
            $modified = $true
        }
    }
    
    if ($modified) {
        $content | Set-Content $_.FullName -NoNewline
        Write-Host "Fixed icons in: $($_.Name)" -ForegroundColor Green
    }
}

# 3. Install Required Packages
Write-Host "`n3. Installing Required Packages..." -ForegroundColor Cyan
cd $mobileDir
npm install expo-image-picker

# 4. Create Camera Fix Component
Write-Host "`n4. Creating Camera Fix..." -ForegroundColor Cyan

$cameraFixContent = @'
// utils/camera.js
import * as ImagePicker from 'expo-image-picker';

export const captureImage = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera permissions!');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [1, 1],
      quality: options.quality ?? 0.7,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
};

export const pickImage = async (options = {}) => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need gallery permissions!');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect ?? [1, 1],
      quality: options.quality ?? 0.7,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
};
'@

$cameraFixContent | Out-File -FilePath "$mobileDir\src\utils\camera.js" -Encoding UTF8

# 5. Restart Services
Write-Host "`n5. Restarting Services..." -ForegroundColor Cyan

# Kill existing processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Pramaan - Attendance - System\Pramaan-Attendance-System\backend'; npm start"

# Wait a bit for backend to start
Start-Sleep -Seconds 5

# Start Expo
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mobileDir'; npx expo start -c"

Write-Host "`nAll fixes applied!" -ForegroundColor Green
Write-Host "`nTest Credentials:" -ForegroundColor Yellow
Write-Host "Email: admin1@gmail.com" -ForegroundColor White
Write-Host "Password: Admin111" -ForegroundColor White
Write-Host "`nThe app should now work properly!" -ForegroundColor Green