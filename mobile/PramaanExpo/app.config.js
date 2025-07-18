// mobile/PramaanExpo/app.config.js
export default {
  expo: {
    name: "Pramaan",
    slug: "pramaan-attendance",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#6200EA"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.pramaan.attendance",
      infoPlist: {
        NSCameraUsageDescription: "This app uses camera for QR code scanning and face enrollment",
        NSFaceIDUsageDescription: "This app uses Face ID for secure attendance marking"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#6200EA"
      },
      package: "com.pramaan.attendance",
      versionCode: 1,
      minSdkVersion: 26,  // Updated from 24 to 26
      permissions: [
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "USE_FINGERPRINT",
        "USE_BIOMETRIC",
        "VIBRATE"
      ]
    },
    plugins: [
      "expo-dev-client",
      "expo-camera",
      "expo-location",
      "expo-local-authentication"
    ]
  }
};