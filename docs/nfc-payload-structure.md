# NFC Payload Structure

## Overview
IronIQ uses NFC-enabled gym equipment to automatically track workouts. Each device contains a CompactNFCPayload that rotates session IDs on every tap.

## Payload Format

```typescript
interface CompactNFCPayload {
  m: string;                    // machine_id
  t: string;                    // machine_type (exercise name)
  a: string;                    // next session ID (for new workouts)
  s: Array<[                    // sessions array
    string,                     // role: "b" (active), "c" (last completed), "d" (older completed)
    string,                     // session id
    Array<[number, number]>     // sets: [weight_lbs, reps]
  ]>;
}
```

## Example Payloads

### Empty Machine (No Active Sessions)
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "Tay8gs",
  "s": []
}
```

### Machine with Active Session
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "newID123",
  "s": [
    ["b", "Tay8gs", [[60, 8], [55, 10]]],
    ["c", "nja8op", [[50, 3], [50, 3]]],
    ["d", "nt9qlt", [[50, 2]]]
  ]
}
```

## Field Definitions

### `m` - Machine ID
- Unique identifier for the specific piece of gym equipment
- Example: `"1234"`
- Used to track workout history per machine

### `t` - Machine Type
- The type of exercise this machine is for
- Example: `"bicep"` for bicep curl machine
- Used for categorization and display

### `a` - Next Session ID
- The session ID that will be assigned to the next workout
- A unique 6-character base36 identifier
- Example: `"Tay8gs"`
- **This is the ID the app saves when starting a workout**

### `s` - Sessions Array
Array of recent sessions, each containing:

1. **Role** (position 0):
   - `"b"` - Active session (currently in progress)
   - `"c"` - Last completed session
   - `"d"` - Older completed session

2. **Session ID** (position 1):
   - 6-character base36 identifier
   - Example: `"nja8op"`
   - Used to match tap-in with tap-out

3. **Sets** (position 2):
   - Array of `[weight_lbs, reps]` tuples
   - Example: `[[60, 8], [55, 10]]` = 2 sets (60lbs×8 reps, 55lbs×10 reps)
   - Device automatically records this during workout
   - Can be empty `[]` for active sessions with no sets yet

## Session ID Rotation

**The device handles ID rotation automatically on every tap:**

### Before Tap
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "Tay8gs",
  "s": []
}
```

### After Tap (Tap-In)
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "newID123",
  "s": [
    ["b", "Tay8gs", []]
  ]
}
```

**What happened:**
1. The `a` field rotated to a new session ID (`"newID123"`)
2. The previous `a` value (`"Tay8gs"`) became an active session with role `"b"`
3. The app saves `"Tay8gs"` as the session ID for this workout

### After Tap-Out (Completing Workout)
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "newID123",
  "s": [
    ["c", "Tay8gs", [[60, 8], [55, 10]]],
  ]
}
```

**What happened:**
1. The active session (`"b"`) changed to completed (`"c"`)
2. The device recorded the sets performed during the workout
3. The `a` field stays the same (ready for next user)

### Multiple Sessions Example
```json
{
  "m": "1234",
  "t": "bicep",
  "a": "abc123",
  "s": [
    ["b", "newID123", [[65, 6]]],
    ["c", "Tay8gs", [[60, 8], [55, 10]]],
    ["d", "nja8op", [[50, 12]]]
  ]
}
```

**Session history shows:**
- Active workout in progress (`"b"`) with 1 set completed
- Last completed workout (`"c"`) with 2 sets
- Older completed workout (`"d"`) with 1 set

## Workflow Summary

1. **Tap-In**: App reads NFC tag, saves the `a` field as session ID, device rotates to new active session
2. **During Workout**: Device records sets automatically (weight/reps tracked by equipment)
3. **Tap-Out**: App reads NFC tag again, looks for matching session ID in `s` array to retrieve workout data
4. **Session Matching**: The session ID saved at tap-in matches the session in the `s` array at tap-out