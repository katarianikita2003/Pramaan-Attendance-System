# 🚀 Pramaan Attendance System - Quick Start Guide

## System Status
✅ **ZKP Simulation Mode**: Active and working
✅ **MongoDB**: Ready (will auto-connect on start)
✅ **Location Verification**: Configured
✅ **Frontend**: Complete and functional

## Starting the System

### 1. Start MongoDB (if not running)
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 2. Start the Server
```bash
npm start
```

You should see:
```
⚠️  ZKP running in simulation mode
✅ ZKP Manager initialized in simulation mode
🚀 Pramaan Backend Server running on port 5000
🔐 ZKP Integration: Simulated (Run "npm run setup-zkp" for real ZKP)
🗄️  MongoDB: Connected
Default admin created - Username: admin, Password: admin123
```

### 3. Access the System
Open your browser and go to: `http://localhost:5000`

## Default Credentials
- **Admin Login**: 
  - Username: `admin`
  - Password: `admin123`

## Testing the System

### 1. Admin Functions
1. Login with admin credentials
2. Register a new scholar (try ID: `PHD001`)
3. Configure campus location (default: BHU campus)
4. View the dashboard

### 2. Scholar Attendance
1. Go to Scholar Portal
2. Enter the scholar ID you registered
3. Click "Mark Attendance"
4. The system will:
   - ✅ Verify your location (must be on campus)
   - ✅ Simulate biometric verification (click the scanner)
   - ✅ Generate a ZKP proof (simulated)
   - ✅ Record attendance

### 3. Verify ZKP is Working
Check the console output when marking attendance:
```
🔐 Generating ZK proof...
⚠️  Using simulated proof (not cryptographically secure)
✅ ZK proof generated
🔍 Verifying ZK proof...
⚠️  Using simulated verification
✅ Proof verified
```

## Features Working in Simulation Mode

1. **Privacy-Preserving Authentication**
   - Biometric data is never stored
   - Only commitments are saved
   - Proofs don't reveal biometric info

2. **Location Verification**
   - Real GPS verification
   - Configurable campus boundaries
   - Anti-spoofing warnings

3. **Complete Audit Trail**
   - All proofs are logged
   - Attendance records include proof data
   - Admin can view ZKP statistics

## Production Deployment

When ready for production with real ZKP:

1. Install Circom 2.0:
   ```bash
   npm install -g circom2
   ```

2. Run the real ZKP setup:
   ```bash
   npm run setup-zkp
   ```

3. Remove the simulation flag from server.js:
   ```javascript
   // Remove or comment out:
   // global.ZKP_SIMULATION_MODE = true;
   ```

4. Restart the server

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is installed and running
- Check if port 27017 is available
- Try connecting with: `mongosh`

### Location Verification Not Working
- Ensure browser location permissions are enabled
- Use HTTPS in production for location access
- Check campus location settings in admin panel

### ZKP Errors
- The simulation mode should work without issues
- For real ZKP, ensure Circom 2.0 is installed
- Check that all circuit files are generated

## Next Steps

1. **Test all features** in simulation mode
2. **Add real biometric hardware** when available
3. **Deploy to production** with HTTPS
4. **Upgrade to real ZKP** for cryptographic security

---

## Support

If you encounter any issues:
1. Check the server console for error messages
2. Verify MongoDB is running
3. Ensure all npm packages are installed
4. Try the fallback setup: `node setup-zkp-fallback.js`

The system is fully functional in simulation mode and ready for demonstration!