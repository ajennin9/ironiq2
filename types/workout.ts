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
  workoutId: string;
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
  name: string; // Default: "MM/DD/YYYY Workout"
  startedAt: string;
  endedAt?: string;
  notes?: string;
  exerciseSessions: ExerciseSession[]; // Denormalized for fast display
  totalVolume: number; // kg
  totalSets: number;
  totalDuration: number; // minutes
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