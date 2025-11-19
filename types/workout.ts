// User profile
export interface User {
  userId: string;
  email: string;
  displayName: string;
  preferredWeightUnit: 'lbs' | 'kg'; // Default: 'lbs'
  createdAt: string;
}

// Exercise set (weight and reps)
export interface Set {
  weightLbs: number; // Always stored in lbs, converted for display
  reps: number;
}

// Individual exercise session on one machine
export interface ExerciseSession {
  sessionId: string;
  userId: string;
  workoutId?: string; // Optional: Links this exercise to a workout
  machineId: string;
  machineType: string;
  startedAt: string;
  endedAt: string;
  duration: number; // seconds
  sets: Set[];
}

// Complete workout session (collection of exercises)
export interface Workout {
  workoutId: string;
  userId: string;
  name?: string; // User-defined workout name
  notes?: string; // User notes about the workout
  startedAt: string;
  endedAt?: string;
  status: 'in-progress' | 'completed';
}

// Machine history for "last workout on this machine" feature
export interface MachineHistory {
  machineId: string;
  machineType: string;
  lastExerciseSessionId: string;
  lastWorkoutDate: string;
  lastSets: Set[];
  totalSessions: number;
}

// Active session (stored in AsyncStorage during workout)
export interface ActiveSession {
  sessionId: string;      // From NFC payload.a
  machineId: string;      // From NFC payload.m
  machineType: string;    // From NFC payload.t
  startedAt: string;      // ISO timestamp
}

// NFC Payloads
// Compact NFC payload format (size-optimized)
export interface CompactNFCPayload {
  m: string;                    // machine_id
  t: string;                    // machine_type
  a: string;                    // next session (A) id, base36 short id (6 chars)
  s: Array<[                   // sessions array
    string,                     // role: "b" (active), "c" (last completed), "d" (older completed)
    string,                     // session id, base36 6-char
    Array<[number, number]>     // sets: [weight_lbs, reps] (weight can be -1 if unknown)
  ]>;
}