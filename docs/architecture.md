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
                │                         │
                ▼                         ▼
        ┌───────────────┐         ┌──────────────┐
        │   Firebase    │         │ NFC Device   │
        │               │         │              │
        │ - Auth        │         │ - Payload    │
        │ - Firestore   │         │ - Sessions   │
        └───────────────┘         └──────────────┘
```

### Component Breakdown

#### UI Layer
- **Screens**: Auth (login/signup), Home (NFC scanning), Profile
- **Components**: Reusable UI elements, buttons, inputs
- **Navigation**: Expo Router (file-based routing)

#### State Layer
- **Auth Store**: User authentication state, login/logout
- **Workout Store**: Active session tracking (AsyncStorage-backed)
- **TanStack Query**: Future server state caching (not yet implemented)

#### Service Layer
- **Firebase Service**: Auth operations, Firestore CRUD
- **NFC Service**: Read/write NFC tags, parse NDEF payloads
- **Workout Service**: Business logic for tap-in/tap-out workflow

---

## Data Architecture

### Local Storage (AsyncStorage)

**Active Session:**
```typescript
// Key: @ironiq/activeSession
{
  sessionId: string;      // From NFC payload.a
  machineId: string;      // From NFC payload.m
  machineType: string;    // From NFC payload.t
  startedAt: string;      // ISO timestamp
}
```

**Auth Tokens:**
- Managed by Firebase React Native persistence
- Automatically refreshed

---

### Remote Storage (Firestore)

**Collections Structure:**

```
users/
  {userId}/
    profile/
      - displayName: string
      - email: string
      - preferences: object
      - createdAt: timestamp

    exerciseSessions/
      {sessionId}/
        - sessionId: string (6-char base36)
        - userId: string
        - workoutId: string | null (for grouping)
        - machineId: string
        - machineType: string
        - startedAt: timestamp
        - endedAt: timestamp
        - duration: number (seconds)
        - sets: Array<{ weightLbs: number, reps: number }>
        - createdAt: timestamp

workouts/ (Post-MVP)
  {workoutId}/
    - workoutId: string
    - userId: string
    - name: string
    - startedAt: timestamp
    - endedAt: timestamp
    - exerciseSessions: string[] (session IDs)
    - totalVolume: number
    - totalSets: number
    - totalDuration: number
```

**Indexes (Firestore):**
```
exerciseSessions:
  - userId + createdAt (desc)
  - userId + machineId + createdAt (desc)
  - userId + machineType + createdAt (desc)
```

---

## NFC Payload Format

**CompactNFCPayload:**
```typescript
interface CompactNFCPayload {
  m: string;                    // machine_id
  t: string;                    // machine_type
  a: string;                    // next session ID
  s: Array<[                    // sessions
    string,                     // role: "b", "c", "d"
    string,                     // session id
    Array<[number, number]>     // sets: [weight, reps]
  ]>;
}
```

**Encoding:** NDEF format, UTF-8 text record, JSON payload

**Example:**
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "Tay8gs",
  "s": [
    ["b", "nja8op", [[60, 8], [55, 10]]],
    ["c", "yszc9i", [[50, 12]]],
    ["d", "nt9qlt", [[45, 15]]]
  ]
}
```

See [nfc-payload-structure.md](./nfc-payload-structure.md) for detailed documentation.

---

## Workflow Architecture

### Tap-In Flow
```
User Action: Tap phone to NFC device
     │
     ▼
NFC Service: Read payload
     │
     ▼
Check: Active session exists?
     │
     ├─ Yes → Show error (already active)
     │
     └─ No → Continue
           │
           ▼
      Save to AsyncStorage:
      - sessionId = payload.a
      - machineId = payload.m
      - machineType = payload.t
      - startedAt = now
           │
           ▼
      Update Zustand Store
           │
           ▼
      UI: Show "Session Active"
```

### Tap-Out Flow
```
User Action: Tap phone to NFC device
     │
     ▼
NFC Service: Read payload
     │
     ▼
Check: Active session exists?
     │
     ├─ No → Start new session (tap-in)
     │
     └─ Yes → Continue
           │
           ▼
      Find session in payload.s where:
      session[1] === activeSession.sessionId
           │
           ├─ Not Found → Show error, clear session
           │
           └─ Found → Extract workout data
                 │
                 ▼
            Create ExerciseSession:
            - sets from session[2]
            - duration = now - startedAt
            - endedAt = now
                 │
                 ▼
            Save to Firestore
                 │
                 ▼
            Clear AsyncStorage
                 │
                 ▼
            Update Zustand Store
                 │
                 ▼
            UI: Show "Workout Complete"
```

See [workflow-logic.md](./workflow-logic.md) for detailed documentation.

---

## Security Architecture

### Authentication
- **Firebase Auth**: Email/password authentication
- **Token Management**: Automatic refresh via Firebase SDK
- **Persistence**: React Native AsyncStorage
- **Session Duration**: Firebase default (1 hour access token, 30 days refresh)

### Authorization Rules (Firestore)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Workouts are user-scoped
    match /workouts/{workoutId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }
  }
}
```

### Data Privacy
- **User Isolation**: All data scoped to userId
- **No Public Data**: Nothing exposed without authentication
- **NFC Data**: Not stored permanently, only used for session matching

---

## Performance Considerations

### Optimizations
1. **AsyncStorage Caching**: Active session loads instantly on app start
2. **Firestore Indexes**: Fast queries for workout history
3. **NFC Read Speed**: NDEF parsing optimized for mobile
4. **Zustand**: Minimal re-renders, no Context API overhead

### Scalability
- **User Data**: Isolated per user, no cross-user queries
- **Session History**: Potentially large (1000s of workouts), pagination needed
- **NFC Payload Size**: ~500 bytes max (NDEF limit ~2KB)

### Future Optimizations
- **React Query**: Cache workout history, reduce Firestore reads
- **Offline Mode**: Queue workout saves, sync when online
- **Compression**: Gzip NFC payloads if size becomes an issue

---

## Error Handling Strategy

### Levels of Error Handling

#### 1. Service Level
```typescript
// services/workout.ts
async completeSession(payload: CompactNFCPayload) {
  try {
    // Business logic
  } catch (error) {
    console.error('Workout service error:', error);
    throw error; // Re-throw for UI handling
  }
}
```

#### 2. UI Level
```typescript
// app/(tabs)/index.tsx
const handleScan = async () => {
  try {
    await workoutService.completeSession(payload);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
```

#### 3. Global Error Boundary
```typescript
// app/_layout.tsx
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

### Error Recovery
- **NFC Read Failure**: Retry scan
- **Session Not Found**: Clear active session, return to ready state
- **Firestore Write Failure**: Retry with exponential backoff
- **Network Offline**: Queue operations (future feature)

---

## Testing Strategy

### Current Testing
- **Manual Testing**: Primary method during MVP
- **Device Testing**: iPhone with NFC capability
- **Real NFC Devices**: Actual gym equipment tags

### Future Testing
- **Unit Tests**: Jest for services and utilities
- **Integration Tests**: React Native Testing Library
- **E2E Tests**: Detox for full user flows
- **Mock NFC**: Simulate payloads for automated testing

---

## Build & Deployment Architecture

### Development
```
Local Machine
    │
    ▼
Expo CLI
    │
    ▼
Metro Bundler (JS)
    │
    ▼
Development Build (EAS)
    │
    ├─ iOS Simulator
    ├─ Physical iPhone (NFC testing)
    └─ TestFlight (beta)
```

### Production
```
GitHub Repository
    │
    ▼
EAS Build (Cloud)
    │
    ├─ iOS Build
    │     │
    │     ▼
    │  App Store Connect
    │     │
    │     ▼
    │  App Store
    │
    └─ Android Build (Future)
          │
          ▼
       Google Play Console
          │
          ▼
       Play Store
```

### Environment Configuration
```
Development:
  - Firebase: Dev project
  - EAS: Development builds
  - Expo: Development server

Production:
  - Firebase: Prod project
  - EAS: Production builds
  - Expo: OTA updates disabled
```

---

## Dependencies Overview

### Core Dependencies
```json
{
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo": "~54.0.0",
  "expo-router": "~5.0.0"
}
```

### State Management
```json
{
  "zustand": "^4.5.0",
  "@react-native-async-storage/async-storage": "^2.1.0",
  "@tanstack/react-query": "^5.62.12"
}
```

### Firebase
```json
{
  "firebase": "^11.1.0"
}
```

### NFC
```json
{
  "react-native-nfc-manager": "^3.16.1"
}
```

### Utilities
```json
{
  "zod": "^3.24.1",
  "date-fns": "^4.1.0"
}
```

---

## Architecture Decisions

### Key Decisions

1. **Zustand over Redux**
   - Simpler API
   - Less boilerplate
   - Better TypeScript support
   - Avoid Context API instability issues from previous project (Rork)

2. **AsyncStorage for Active Sessions**
   - Persist across app restarts
   - Fast access (no network required)
   - Critical for recovery from crashes

3. **Firestore over Realtime Database**
   - Better querying capabilities
   - Document-based model fits workout data
   - Better mobile SDK

4. **Expo over React Native CLI**
   - Faster development
   - EAS Build for cloud builds
   - OTA updates for quick fixes

5. **File-based Routing (Expo Router)**
   - Simpler navigation
   - Type-safe routes
   - Better code organization

### Trade-offs

| Decision | Pros | Cons |
|----------|------|------|
| React 19.1.0 | Latest features, better performance | Required overrides for peer deps |
| EAS Development Builds | Cloud-based, no local Xcode needed | Slower iteration for native changes |
| No Backend API | Simpler architecture, faster MVP | Limited flexibility for complex logic |
| CompactNFCPayload | Small payload size | Harder to debug (compressed format) |

---

## Future Architecture Considerations

### Planned Improvements
- [ ] Add API layer (Cloud Functions) for complex operations
- [ ] Implement offline-first architecture with sync
- [ ] Add analytics and crash reporting
- [ ] Machine learning for workout recommendations
- [ ] Multi-gym support with shared machine database

### Scalability Concerns
- **Large Workout History**: Implement pagination, limit queries
- **Multi-User Gyms**: Need machine registration system
- **Real-time Updates**: Consider Firestore listeners for live data
- **NFC Write Operations**: Future feature to update machine configs

---

## Related Documentation

- [NFC Payload Structure](./nfc-payload-structure.md)
- [Workflow Logic](./workflow-logic.md)
- [Phase 3 Plan](./phase-3-plan.md)
- [Roadmap](./roadmap.md)

---

**Last Updated:** November 10, 2025