# Workout Tracking Workflow Logic

## Overview
IronIQ uses a two-tap workflow: tap to start (tap-in), tap to complete (tap-out). The app uses AsyncStorage to track the active session between taps.

## Complete Workflow

### 1. Tap-In (Starting a Workout)

**Precondition:** No active session exists in AsyncStorage

**User Action:** User taps phone to NFC device

**NFC Payload Read:**
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "Tay8gs",
  "s": [
    ["b", "nja8op", []],
    ["c": "yszc9i", [[50, 3], [50, 3]]],
    ["d", "nt9qlt", [[50, 2]]]
  ]
}
```

**App Logic:**
1. Read NFC payload
2. Check AsyncStorage for active session
3. **No active session found** → This is a tap-in
4. Save to AsyncStorage:
   ```json
   {
     "sessionId": "Tay8gs",
     "machineId": "1234",
     "machineType": "bicep",
     "startedAt": "2025-11-09T10:30:00Z"
   }
   ```
5. Update UI to "Session Active" state
6. User performs workout (device records sets/reps automatically)

**Key Point:** The app saves the ID from the `a` field, NOT from any b/c/d session.

---

### 2. During Workout

**What Happens:**
- User performs their exercise on the machine
- **The device automatically records sets and reps** in real-time
- The device updates the NFC payload continuously
- The app does nothing during this time (session remains in AsyncStorage)

---

### 3. Tap-Out (Completing a Workout)

**Precondition:** Active session exists in AsyncStorage with sessionId "Tay8gs"

**User Action:** User taps phone to NFC device again

**NFC Payload Read (After Device Rotation):**
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "newID456",
  "s": [
    ["b", "Tay8gs", [[60, 8], [55, 10]]],
    ["c", "nja8op", []],
    ["d", "yszc9i", [[50, 3], [50, 3]]]
  ]
}
```

**App Logic:**
1. Read NFC payload
2. Check AsyncStorage for active session
3. **Active session found** with sessionId "Tay8gs" → This is a tap-out
4. Search through `s` array for matching sessionId:
   ```typescript
   const matchedSession = payload.s.find(session => session[1] === "Tay8gs");
   // Found: ["b", "Tay8gs", [[60, 8], [55, 10]]]
   ```
5. Extract workout data from matched session:
   - Sets: `[[60, 8], [55, 10]]`
   - 2 sets: 60lbs×8 reps, 55lbs×10 reps
6. Create complete ExerciseSession object:
   ```typescript
   {
     sessionId: "Tay8gs",
     userId: currentUser.id,
     workoutId: currentWorkout.id,
     machineId: "1234",
     machineType: "bicep",
     startedAt: "2025-11-09T10:30:00Z", // from AsyncStorage
     endedAt: "2025-11-09T10:45:00Z",   // current timestamp
     duration: 900, // 15 minutes in seconds
     sets: [
       { weightLbs: 60, reps: 8 },
       { weightLbs: 55, reps: 10 }
     ]
   }
   ```
7. Save ExerciseSession to Firestore
8. Clear AsyncStorage (session complete)
9. Update UI to "Ready for next workout" state

---

## Session ID Rotation Explained

**The device rotates IDs on every tap:**

```
Before tap:
a: "Tay8gs"
s: []

After tap (device rotates):
a: "newID456" (new ID for next user)
s: [["b", "Tay8gs", []]] (previous 'a' becomes active session)
```

**Why this matters:**
- The app saves `"Tay8gs"` during tap-in
- The device immediately rotates to `"newID456"`
- When the user taps out, the app looks for `"Tay8gs"` in the `s` array
- The session ID acts as a unique key to match tap-in with tap-out

---

## Edge Cases & Error Handling

### Case 1: Session ID Not Found (Tap-Out Fails)

**Scenario:** User tapped in with session ID "Tay8gs", but when they tap out, that ID isn't in the b/c/d positions.

**Possible Causes:**
- Device was reset or reprogrammed
- Another user's session pushed it out of the history
- Device malfunction

**App Behavior:**
```typescript
const matchedSession = payload.s.find(session => session[1] === activeSession.sessionId);

if (!matchedSession) {
  // Session not found!
  Alert.alert(
    "Session Not Found",
    "Could not find your workout data. The session will be cleared.",
    [{ text: "OK", onPress: () => workoutStore.clearActiveSession() }]
  );
  return;
}
```

**Result:** Session cleared, user returned to ready state, no data saved.

---

### Case 2: Active Session Exists When Tapping In

**Scenario:** User has an active session but taps a different machine (or same machine again).

**App Behavior (MVP):**
```typescript
if (activeSession) {
  // User is tapping in while already having an active session
  Alert.alert(
    "Active Session Exists",
    "You already have an active session. Please tap out first.",
    [{ text: "OK" }]
  );
  return;
}
```

**Post-MVP:** Could support multiple concurrent sessions.

---

### Case 3: App Crash During Active Session

**Scenario:** App crashes or is force-closed while user has active session.

**Recovery:**
1. Session remains in AsyncStorage
2. On app restart, workout store's `initialize()` loads the session
3. UI shows "Session Active" state
4. User can tap out normally to complete workout

**Code:**
```typescript
// In stores/workout.ts
initialize: async () => {
  const sessionJson = await AsyncStorage.getItem('@ironiq/activeSession');
  if (sessionJson) {
    const session = JSON.parse(sessionJson);
    set({ activeSession: session });
  }
}

// In app entry point
useEffect(() => {
  workoutStore.initialize();
}, []);
```

---

### Case 4: NFC Scan Fails

**Scenario:** Phone doesn't detect NFC tag or read fails.

**App Behavior:**
```typescript
try {
  const tag = await NfcManager.requestTechnology(NfcTech.Ndef);
  const payload = parseNdefPayload(tag);
  // ... process payload
} catch (error) {
  Alert.alert(
    "NFC Scan Failed",
    "Could not read NFC tag. Please try again.",
    [{ text: "Retry", onPress: handleScan }]
  );
}
```

**Result:** No state changes, user can retry.

---

## Data Flow Diagram

```
┌─────────────┐
│  User Taps  │
│   Device    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  NFC Service    │
│  Read Payload   │
└──────┬──────────┘
       │
       ▼
┌─────────────────────┐
│  Check AsyncStorage │
│  for Active Session │
└──────┬──────────────┘
       │
       ├─── No Active Session (Tap-In)
       │    │
       │    ▼
       │    ┌──────────────────────┐
       │    │ Save to AsyncStorage │
       │    │ - sessionId: a       │
       │    │ - machineId: m       │
       │    │ - machineType: t     │
       │    │ - startedAt: now     │
       │    └──────────────────────┘
       │
       └─── Active Session Exists (Tap-Out)
            │
            ▼
            ┌─────────────────────────┐
            │ Find Session in s Array │
            │ Where session[1] === ID │
            └────┬────────────────────┘
                 │
                 ├─── Found
                 │    │
                 │    ▼
                 │    ┌──────────────────────┐
                 │    │ Extract Sets Data    │
                 │    │ session[2] = [[w,r]] │
                 │    └──────┬───────────────┘
                 │           │
                 │           ▼
                 │    ┌──────────────────────┐
                 │    │ Save to Firestore    │
                 │    │ Clear AsyncStorage   │
                 │    │ Update UI            │
                 │    └──────────────────────┘
                 │
                 └─── Not Found
                      │
                      ▼
                      ┌──────────────────────┐
                      │ Show Error Alert     │
                      │ Clear AsyncStorage   │
                      └──────────────────────┘
```

---

## Complete Code Example

### Workout Service (Core Logic)

```typescript
// services/workout.ts
import { CompactNFCPayload } from '@/types/nfc';
import { ExerciseSession, Set } from '@/types/workout';
import { useWorkoutStore } from '@/stores/workout';
import { db } from './firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { useAuthStore } from '@/stores/auth';

class WorkoutService {
  async startSession(payload: CompactNFCPayload): Promise<void> {
    const activeSession = useWorkoutStore.getState().activeSession;

    if (activeSession) {
      throw new Error('Active session already exists');
    }

    const newSession = {
      sessionId: payload.a,
      machineId: payload.m,
      machineType: payload.t,
      startedAt: new Date().toISOString(),
    };

    await useWorkoutStore.getState().setActiveSession(newSession);
  }

  async completeSession(payload: CompactNFCPayload): Promise<ExerciseSession> {
    const activeSession = useWorkoutStore.getState().activeSession;

    if (!activeSession) {
      throw new Error('No active session found');
    }

    // Find matching session in payload
    const matchedSession = this.findSessionById(payload, activeSession.sessionId);

    if (!matchedSession) {
      throw new Error('Session ID not found in device payload');
    }

    // Extract workout data
    const [role, sessionId, compactSets] = matchedSession;
    const sets = this.parseSets(compactSets);

    const endedAt = new Date();
    const startedAt = new Date(activeSession.startedAt);
    const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    // Create exercise session
    const userId = useAuthStore.getState().user?.uid;
    if (!userId) throw new Error('User not authenticated');

    const exerciseSession: ExerciseSession = {
      sessionId: activeSession.sessionId,
      userId,
      workoutId: null, // MVP: no workout grouping
      machineId: activeSession.machineId,
      machineType: activeSession.machineType,
      startedAt: Timestamp.fromDate(startedAt),
      endedAt: Timestamp.fromDate(endedAt),
      duration,
      sets,
    };

    // Save to Firestore
    const sessionRef = doc(
      collection(db, 'users', userId, 'exerciseSessions'),
      sessionId
    );
    await setDoc(sessionRef, exerciseSession);

    // Clear active session
    await useWorkoutStore.getState().clearActiveSession();

    return exerciseSession;
  }

  private findSessionById(
    payload: CompactNFCPayload,
    sessionId: string
  ): [string, string, Array<[number, number]>] | null {
    return payload.s.find(session => session[1] === sessionId) || null;
  }

  private parseSets(compactSets: Array<[number, number]>): Set[] {
    return compactSets.map(([weightLbs, reps]) => ({
      weightLbs,
      reps,
    }));
  }
}

export const workoutService = new WorkoutService();
```

---

## AsyncStorage Schema

**Key:** `@ironiq/activeSession`

**Value:**
```json
{
  "sessionId": "Tay8gs",
  "machineId": "1234",
  "machineType": "bicep",
  "startedAt": "2025-11-09T10:30:00.000Z"
}
```

**Lifecycle:**
- **Created:** During tap-in
- **Read:** On app startup (session recovery)
- **Cleared:** After successful tap-out or error handling

---

## Key Takeaways

1. **The `a` field is always the "next" session ID** - this is what gets saved during tap-in
2. **Session IDs rotate automatically** - the device handles this, not the app
3. **The app only needs to save and match IDs** - workout data comes from the device
4. **Active sessions persist across app restarts** - using AsyncStorage
5. **Error handling is critical** - session ID might not be found at tap-out