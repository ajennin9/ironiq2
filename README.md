# IronIQ

An NFC-enabled iOS app for seamless gym workout tracking. Tap your phone on gym equipment to automatically log exercises, sets, and reps.

## Overview

IronIQ transforms gym equipment into smart tracking devices using NFC technology. Simply tap your iPhone on the NFC tag when you start an exercise (tap-in) and tap again when you're done (tap-out) - the app automatically records your sets, reps, and weight.

### Key Features

- **Tap-to-Track Workflow** - Tap NFC tag to start/stop exercise tracking
- **Automatic Data Capture** - Sets, reps, and weight logged automatically
- **Workout Grouping** - Multiple exercises organized into a single workout session
- **Session Persistence** - Active workouts saved across app restarts
- **Firebase Integration** - Secure cloud storage for workout history
- **Continue Workout** - Resume active workouts from home screen

## Tech Stack

- **Framework:** React Native (Expo SDK 54) with Expo Router
- **Language:** TypeScript
- **State Management:** Zustand with AsyncStorage persistence
- **Backend:** Firebase (Authentication, Firestore)
- **NFC:** react-native-nfc-manager
- **Data Fetching:** TanStack React Query
- **UI:** Custom components with Roboto font

## Project Status

**Current Phase:** Phase 3 Complete ✅
**Status:** Core workout flow implemented with workout grouping
**Target:** MVP Release

Recent completions:
- Two-tap workout flow (tap-in/tap-out)
- Active session management with state persistence
- Workout grouping (multiple exercises per workout)
- Continue workout functionality
- Firebase Firestore integration

See [docs/roadmap.md](docs/roadmap.md) for detailed project status and future plans.

## Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Device** with NFC capability (iPhone 7 or newer)
- **Apple Developer Account** (for NFC entitlements)
- **Firebase Project** (for authentication and data storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ajennin9/ironiq2.git
   cd ironiq2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the project root:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Create a development build**

   NFC requires a development build (Expo Go does not support NFC):
   ```bash
   npx expo install expo-dev-client
   eas build --profile development --platform ios
   ```

5. **Install the development build** on your iOS device via TestFlight or direct download

6. **Start the development server**
   ```bash
   npm start
   ```

7. **Scan the QR code** with your development build to run the app

### Running the App

- **Start development server:** `npm start`
- **iOS:** `npm run ios` (simulator only - no NFC support)
- **Android:** `npm run android` (NFC support varies by device)

Note: For full NFC functionality, you must use a physical iOS device with a development build.

## Documentation

### Technical Documentation
- [Architecture Overview](docs/architecture.md) - System design, tech stack, and data models
- [NFC Payload Structure](docs/nfc-payload-structure.md) - NFC tag format specification
- [Workflow Logic](docs/workflow-logic.md) - Detailed tap-in/tap-out flow documentation

### Project Planning
- [Roadmap](docs/roadmap.md) - Development phases, features, and timelines

### Key Concepts

**Two-Tap Workflow:**
1. **Tap-in** - Tap NFC tag when starting an exercise
2. **Perform Exercise** - Complete your sets and reps
3. **Tap-out** - Tap the same tag when finished to log the workout

**Session Management:**
- Each tap-in creates a session with a rotating session ID
- Sessions persist in AsyncStorage across app restarts
- Tap-out matches the session ID to complete the workout
- Multiple exercises can be grouped into a single workout

**Workout Grouping:**
- First exercise of the day creates a new workout
- Subsequent exercises (within same day) join the active workout
- "Continue Workout" button appears when a workout is in progress
- Workouts are saved to Firestore with all exercises grouped

## Development

### Project Structure

```
ironiq2/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main app tabs (home, history, profile)
│   └── _layout.tsx        # Root layout with auth guard
├── components/            # Reusable UI components
├── constants/             # Colors, fonts, and other constants
├── services/              # Business logic and external integrations
│   ├── firebase.ts        # Firebase initialization
│   ├── nfc.ts            # NFC scanning and parsing
│   └── workout.ts        # Workout session management
├── stores/                # Zustand state stores
│   ├── auth.ts           # Authentication state
│   └── workout.ts        # Active workout state
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation
```

### Key Services

- **NFC Service** ([services/nfc.ts](services/nfc.ts)) - NFC tag scanning and payload parsing
- **Workout Service** ([services/workout.ts](services/workout.ts)) - Session management, workout grouping, and Firestore integration
- **Firebase Service** ([services/firebase.ts](services/firebase.ts)) - Firebase initialization and configuration

### State Management

- **Auth Store** ([stores/auth.ts](stores/auth.ts)) - User authentication state
- **Workout Store** ([stores/workout.ts](stores/workout.ts)) - Active workout sessions with AsyncStorage persistence

## NFC Configuration

### iOS Setup

The app requires NFC entitlements in `app.json`:

```json
{
  "ios": {
    "infoPlist": {
      "NFCReaderUsageDescription": "IronIQ needs NFC access to read workout data from gym equipment."
    },
    "entitlements": {
      "com.apple.developer.nfc.readersession.formats": ["NDEF"]
    }
  }
}
```

### NFC Tag Format

IronIQ uses a compact NFC payload structure:

```typescript
{
  m: "machineId",    // Machine identifier
  e: "exerciseName", // Exercise name
  s: "sessionId",    // Rotating session ID
  w: 135,            // Weight (optional)
  r: [12, 10, 8]     // Reps for tap-out (optional)
}
```

See [docs/nfc-payload-structure.md](docs/nfc-payload-structure.md) for complete specification.

## Building for Production

### Create Production Build

```bash
eas build --profile production --platform ios
```

### Submit to App Store

```bash
eas submit --platform ios
```

See [Expo EAS documentation](https://docs.expo.dev/build/introduction/) for detailed build and submission guides.

## Known Issues

- NFC scanning requires a physical iOS device (not supported in simulator)
- Development builds required for NFC functionality (Expo Go does not support NFC)
- Some debug console.logs still present in NFC service

See [docs/roadmap.md](docs/roadmap.md#known-issues--blockers) for complete list.

## Roadmap

### Completed
- ✅ User authentication
- ✅ NFC scanning and parsing
- ✅ Tap-in/tap-out workflow
- ✅ Workout grouping
- ✅ Session persistence
- ✅ Firebase integration

### Upcoming (Post-MVP)
- Edit workouts and manual set entry
- Workout history and analytics
- Progress charts
- Android support
- Advanced session management

See [docs/roadmap.md](docs/roadmap.md) for detailed feature timeline.

## Contributing

This is currently a solo project by [@ajennin9](https://github.com/ajennin9).

For questions, bugs, or feature requests:
- Open an issue on [GitHub](https://github.com/ajennin9/ironiq2/issues)

## License

[Add your license here]

---

**Built with Expo • Powered by Firebase • Made for iOS**
