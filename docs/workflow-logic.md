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