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

### Before