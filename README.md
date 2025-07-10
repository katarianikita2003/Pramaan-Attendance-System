# Pramaan - Zero-Knowledge Proof Attendance System

## Overview

Pramaan is a revolutionary attendance management system that combines biometric authentication with Zero-Knowledge Proof (ZKP) cryptography to create a secure, privacy-preserving, and tamper-proof attendance tracking solution.

## Features

- 🔐 **Zero-Knowledge Proof Authentication**: Verify identity without storing biometric data
- 🏢 **Multi-Organization Support**: Multiple organizations can use the same app
- 📍 **Location-Based Attendance**: Geofencing ensures physical presence
- 🎯 **Tamper-Proof Records**: Cryptographic proofs that cannot be faked
- 📱 **Mobile First**: React Native app for Android (iOS coming soon)
- 🔍 **Real-time Analytics**: Dashboard with attendance insights

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB
- **Mobile**: React Native (Expo)
- **Authentication**: JWT, Biometric APIs
- **ZKP**: Circom, SnarkJS (currently in simulation mode)

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- Expo CLI
- Android Studio (for Android development)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Update MongoDB connection string in `.env`

5. Start the server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Mobile App Setup

1. Navigate to mobile directory:
```bash
cd mobile/PramaanExpo
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URL in `src/config/constants.ts`:
```javascript
export const API_BASE_URL = 'http://YOUR_BACKEND_IP:5000/api';
```

4. Start the Expo development server:
```bash
npx expo start
```

5. Run on Android:
   - Press `a` to open in Android emulator
   - Or scan QR code with Expo Go app on physical device

## Project Structure

```
pramaan/
├── backend/
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # MongoDB models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── utils/        # Utility functions
│   └── server.js         # Main server file
│
└── mobile/
    └── PramaanExpo/
        ├── src/
        │   ├── components/   # Reusable components
        │   ├── config/       # App configuration
        │   ├── contexts/     # React contexts
        │   ├── navigation/   # Navigation setup
        │   ├── screens/      # App screens
        │   └── services/     # API services
        └── App.js           # App entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register-organization` - Register new organization
- `POST /api/auth/admin-login` - Admin login
- `POST /api/auth/scholar/login` - Scholar login

### Admin
- `GET /api/admin/dashboard` - Get dashboard data
- `GET /api/admin/scholars` - List all scholars
- `POST /api/admin/scholars` - Add new scholar
- `GET /api/admin/reports` - Get attendance reports

### Scholar
- `GET /api/scholar/profile` - Get scholar profile
- `GET /api/scholar/stats` - Get attendance stats
- `GET /api/scholar/attendance/history` - Get attendance history

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/verify/:proofId` - Verify attendance proof

## Default Credentials

After registering an organization, use these test credentials:

- **Admin Login**:
  - Email: Use the email you registered with
  - Password: Your chosen password

## Current Status

✅ **Working Features**:
- Organization registration
- Admin login and dashboard
- Scholar management (backend ready)
- Basic attendance marking (backend ready)
- JWT authentication
- Database models and relationships

⚠️ **In Progress**:
- Scholar biometric enrollment
- ZKP proof generation (currently simulated)
- Location-based attendance verification
- Scholar mobile app features

## Known Issues

1. **Navigation Issue**: After successful admin login, the app might get stuck. This is being fixed.
2. **ZKP Implementation**: Currently using simulated proofs. Real ZKP circuits need to be implemented.
3. **Biometric Integration**: Face/fingerprint capture needs to be integrated with device APIs.

## Development Tips

1. **MongoDB Connection**: Make sure MongoDB is running before starting the backend
2. **IP Address**: Use your computer's local IP (not localhost) in mobile app for device testing
3. **Logs**: Check `backend/logs/` directory for server logs
4. **Hot Reload**: Both backend (with nodemon) and mobile (with Expo) support hot reloading

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact: support@pramaan.app