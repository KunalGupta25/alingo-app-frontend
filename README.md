# Alingo - Frontend (React Native + Expo)

A modern mobile application built with React Native and Expo Router for language learning and social networking.

## 🚀 Features

- **Phone Number Authentication** - SMS-based OTP verification with Firebase
- **User Profiles** - Complete profile management with bio, age, and gender
- **Identity Verification** - Two-step verification process with ID and selfie upload
- **Protected Routes** - Verification status-based navigation
- **Firebase Integration** - Storage for identity verification documents
- **Modern UI/UX** - Beautiful gradient designs with smooth animations

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI** - Install globally: `npm install -g expo-cli`
- **Expo Go** app on your mobile device (for testing)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KunalGupta25/alingo-app-front.git
   cd alingo-app-front
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   
   Update `services/firebase.ts` with your Firebase configuration:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Configure Backend API**
   
   Update `constants/config.ts` with your backend URL:
   ```typescript
   export const API_BASE_URL = 'http://your-backend-url:8000';
   ```

## 🚦 Running the Application

### Development Mode

```bash
npm start
```

This will start the Expo development server. You can then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go app on your physical device

### Platform-Specific Commands

```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📱 App Structure

```
frontend/
├── app/                          # App screens and routing
│   ├── auth/                     # Authentication screens
│   │   ├── login.tsx            # Phone number login
│   │   └── otp.tsx              # OTP verification
│   ├── (protected)/             # Protected routes
│   │   ├── complete-profile.tsx # Profile completion
│   │   ├── identity-verification.tsx # ID & selfie upload
│   │   ├── verification-pending.tsx  # Waiting for approval
│   │   └── home.tsx            # Main home screen
│   ├── index.tsx                # Entry point with auth routing
│   └── _layout.tsx              # Root layout
├── services/                     # API and external services
│   ├── api.ts                   # Backend API calls
│   └── firebase.ts              # Firebase configuration
├── constants/                    # App configuration
│   └── config.ts                # API URLs and constants
└── package.json                 # Dependencies
```

## 🔐 Authentication Flow

1. **Login** - User enters phone number
2. **OTP Verification** - User receives and enters OTP
3. **Profile Completion** - New users complete their profile (name, age, bio, gender)
4. **Identity Verification** - Users upload ID document and selfie
5. **Pending Approval** - Users wait for admin verification
6. **Home Access** - Verified users access the main app

## 🔑 Key Technologies

- **React Native** - Cross-platform mobile framework
- **Expo** - Development and build tooling
- **Expo Router** - File-based routing
- **Firebase** - Authentication and storage
- **Axios** - HTTP client for API calls
- **AsyncStorage** - Local data persistence
- **TypeScript** - Type-safe development

## 📦 Main Dependencies

```json
{
  "expo": "~54.0.32",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo-router": "^6.0.22",
  "firebase": "^12.8.0",
  "axios": "^1.13.3",
  "expo-image-picker": "~17.0.10",
  "expo-camera": "~17.0.10"
}
```

## 🌐 API Endpoints Used

- `POST /api/authentication/register/` - User registration
- `POST /api/authentication/verify-otp/` - OTP verification
- `POST /api/authentication/login/` - User login
- `GET /api/verification/status/` - Check verification status
- `POST /api/verification/submit/` - Submit identity verification

## 📝 Environment Setup

The app expects a backend server running. Make sure to:
1. Start the Django backend server
2. Update the `API_BASE_URL` in `constants/config.ts`
3. Ensure your device/emulator can reach the backend URL

## 🐛 Troubleshooting

### Common Issues

**Metro bundler not starting**
```bash
npx expo start -c
```

**Dependencies issues**
```bash
rm -rf node_modules
npm install
```

**Cache issues**
```bash
npx expo start -c
```

**Firebase not working**
- Verify your Firebase configuration is correct
- Check Firebase Console for enabled services
- Ensure Storage rules allow uploads

## 📄 License

This project is private and proprietary.

## 👥 Author

**Kunal Gupta**
- GitHub: [@KunalGupta25](https://github.com/KunalGupta25)

## 🤝 Contributing

This is a private repository. Please contact the owner for collaboration opportunities.
