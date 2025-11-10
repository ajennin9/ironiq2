# Phase 3: Core Workout Flow - Implementation Plan

## Status
**Phase 1:** ✅ Complete (Authentication)
**Phase 2:** ✅ Complete (Basic NFC Integration)
**Phase 3:** 📋 Ready to Start

## Overview
Implement the complete tap-in/tap-out workout tracking flow with session management, workout data extraction, and Firestore persistence.

---

## Components to Build

### 1. Active Session Store (Zustand)
**File:** `stores/workout.ts`

**Purpose:** Track the currently active exercise session across app restarts

**State:**
```typescript
interface WorkoutStore {
  activeSession: ActiveSession | null;
  setActiveSession: (session: ActiveSession) => void;
  clearActiveSession: () => void;
  initialize: () => Promise<void>; // Load from AsyncStorage
}

interface ActiveSession {
  sessionId: string;      // From NFC payload.a
  machineId: string;      // From NFC payload.m
  machineType: string;    // From NFC payload.t
  startedAt: string;      // ISO timestamp when tap-in occurred
}
```

**AsyncStorage Key:** `@ironiq/activeSession`

---

### 2. Workout Service
**File:** `services/workout.ts`

**Purpose:** Handle workout session business logic

**Methods:**

```typescript
class WorkoutService {
  /**
   * Start a new exercise session (tap-in)
   * Saves session to AsyncStorage and updates store
   */
  async startSession(payload: CompactNFCPayload): Promise<void>;

  /**
   * Complete an exercise session (tap-out)
   * Finds matching session in payload, extracts workout data, saves to Firestore
   */
  async completeSession(payload: CompactNFCPayload): Promise<ExerciseSession>;

  /**
   * Clear active session (error handling)
   */
  async clearSession(): Promise<void>;

  /**
   * Find session in payload by ID
   * Returns matched session or null
   */
  private findSessionById(
    payload: CompactNFCPayload,
    sessionId: string
  ): [string, string, Array<[number, number]>] | null;

  /**
   * Convert compact sets format to ExerciseSession sets
   */
  private parseSets(
    compactSets: Array<[number, number]>
  ): Set[];
}
```

---

### 3. Update Home Screen
**File:** `app/(tabs)/index.tsx`

**UI States:**

#### State 1: No Active Session
```tsx
<View>
  <Text>Ready to Start Workout</Text>
  <Button
    title="Tap to Start"
    onPress={handleNFCScan}
  />
</View>
```

#### State 2: Active Session
```tsx
<View>
  <Text>Session Active</Text>
  <Text>{activeSession.machineType}</Text>
  <Text>Started: {formatElapsedTime(activeSession.startedAt)}</Text>
  <Button
    title="Tap to Complete"
    onPress={handleNFCScan}
  />
</View>
```

**Handler Logic:**
```typescript
const handleNFCScan = async () => {
  const payload = await nfcService.readTag();

  if (activeSession) {
    // Tap-out flow
    await workoutService.completeSession(payload);
  } else {
    // Tap-in flow
    await workoutService.startSession(payload);
  }
};
```

---

### 4. Type Updates
**File:** `types/workout.ts`

**Add ActiveSession interface:**
```typescript
export interface ActiveSession {
  sessionId: string;
  machineId: string;
  machineType: string;
  startedAt: string;
}
```

---

## Implementation Steps

### Step 1: Create Workout Store
- [ ] Create `stores/workout.ts`
- [ ] Implement Zustand store with AsyncStorage persistence
- [ ] Add `initialize()` method to load session on app start
- [ ] Test: Save session, restart app, verify it loads

### Step 2: Create Workout Service
- [ ] Create `services/workout.ts`
- [ ] Implement `startSession()` method
- [ ] Implement `completeSession()` method
- [ ] Implement `findSessionById()` helper
- [ ] Implement `parseSets()` helper
- [ ] Test: Full tap-in/tap-out flow with real NFC device

### Step 3: Update Home Screen
- [ ] Import workout store
- [ ] Add conditional rendering based on `activeSession`
- [ ] Update `handleScan` to call appropriate service method
- [ ] Add elapsed time display for active sessions
- [ ] Test: UI switches correctly between states

### Step 4: Add Firestore Integration
- [ ] Create Firestore collection structure
- [ ] Add `exerciseSessions` collection
- [ ] Add `workouts` collection (parent document)
- [ ] Implement save logic in `completeSession()`
- [ ] Test: Verify data appears in Firestore console

### Step 5: Error Handling
- [ ] Handle case: sessionId not found in b/c/d positions
  - Show error alert
  - Clear AsyncStorage
  - Return to ready state
- [ ] Handle case: NFC scan fails during tap-out
  - Keep session active
  - Allow retry
- [ ] Test: Various error scenarios

---

## MVP Scope

**In Scope:**
- Basic tap-in/tap-out flow
- Single active session tracking
- Save completed sessions to Firestore
- Display active session state
- Simple error handling (clear session if not found)

**Out of Scope (Post-MVP):**
- Multiple concurrent active sessions
- Advanced edge case handling
- Session timeout logic
- Workout editing/modification
- Historical workout data display
- Workout analytics

---

## Testing Checklist

### Happy Path
- [ ] User taps to start workout
- [ ] Session saved to AsyncStorage
- [ ] UI shows "Session Active"
- [ ] User performs workout (device records data)
- [ ] User taps to complete workout
- [ ] App finds matching session in NFC payload
- [ ] ExerciseSession saved to Firestore
- [ ] AsyncStorage cleared
- [ ] UI returns to "Ready to Start" state

### Error Cases
- [ ] SessionId not found in b/c/d → Show error, clear session
- [ ] NFC scan fails during tap-in → Show error, no session created
- [ ] NFC scan fails during tap-out → Show error, keep session active
- [ ] App closes during active session → Session loads on restart
- [ ] User taps different machine during active session → (Post-MVP handling)

---

## Firestore Structure

```
users/{userId}/
  exerciseSessions/{sessionId}/
    - sessionId: string
    - userId: string
    - workoutId: string (for grouping, can be null for MVP)
    - machineId: string
    - machineType: string
    - startedAt: timestamp
    - endedAt: timestamp
    - duration: number (seconds)
    - sets: array of { weightLbs: number, reps: number }
    - createdAt: timestamp

workouts/{workoutId}/ (Post-MVP - for grouping multiple exercises)
    - workoutId: string
    - userId: string
    - name: string (e.g., "11/09/2025 Workout")
    - startedAt: timestamp
    - endedAt: timestamp
    - exerciseSessions: array (denormalized)
    - totalVolume: number
    - totalSets: number
    - totalDuration: number
```

---

## Next Steps After Phase 3

**Phase 4:** Edit & Finish Workflows
- Edit sets during workout
- Manual set entry
- Delete/modify completed workouts

**Phase 5:** Polish & Testing
- Workout history display
- Machine history ("last workout on this machine")
- Analytics and progress tracking
- Error recovery improvements
