# IronIQ Architecture

## Overview
IronIQ is a React Native mobile app that uses NFC-enabled gym equipment to automatically track workouts. Users tap their phone to start and complete exercise sessions, with the device automatically recording sets and reps.

## Technology Stack

### Frontend
- **React Native 0.81.5** - Mobile framework
- **Expo SDK 54** - Development platform
- **Expo Router** - File-based navigation
- **TypeScript** - Type safety
- **React 19.1.0** - UI library (with npm overrides for compatibility)

### State Management
- **Zustand** - Global state (auth, workouts)
- **AsyncStorage** - Local persistence (active sessions, auth tokens)
- **TanStack Query** - Server state management (installed, not yet used)

### Backend
- **Firebase Auth** - User authentication
- **Firestore** - NoSQL database
- **React Native persistence** - Auth token storage

### NFC
- **react-native-nfc-manager** - NFC reading
- **NDEF format** - NFC data encoding
- **CompactNFCPayload** - Custom JSON format for workout data

### Build & Deploy
- **EAS Build** - Cloud build service
- **Development Builds** - Custom native builds (required for NFC)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Mobile App                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  UI Layer    │  │  State Layer │  │ Service Layer│      │
│  │              │  │              │  │              │      │
│  │ - Screens    │──│ - Auth Store │──│ - Firebase   │      │
│  │ - Components │  │ - Workout    │  │ - NFC        │      │
│  │              │  │   Store      │  │ - Workout    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │