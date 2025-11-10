import { CompactNFCPayload, ExerciseSession } from '@/types/workout';

// Convert compact NFC payload to app's internal session format for saving
export function convertCompactSessionToExerciseSession(
  compactPayload: CompactNFCPayload,
  sessionRole: 'b' | 'c' | 'd',
  userId: string,
  workoutId: string,
  startTime: number,
  endTime: number
): ExerciseSession | null {
  // Find the session data for the specified role
  const sessionEntry = compactPayload.s.find(([role]) => role === sessionRole);
  if (!sessionEntry) {
    return null;
  }

  const [, sessionId, sets] = sessionEntry;

  return {
    sessionId: `session-${Date.now()}`, // Generate new session ID for app
    userId,
    workoutId,
    machineId: compactPayload.m,
    machineType: compactPayload.t,
    startedAt: new Date(startTime).toISOString(),
    endedAt: new Date(endTime).toISOString(),
    sets: sets.map(([weightLbs, reps]) => ({
      weightLbs: weightLbs === -1 ? 0 : weightLbs, // Convert -1 (unknown) to 0
      reps,
    })),
  };
}

// Extract session matching logic for tap-out detection
export function findMatchingCompactSession(
  compactPayload: CompactNFCPayload,
  currentSessionId: string | null
): { role: 'b' | 'c' | 'd'; sessionId: string; sets: Array<[number, number]> } | null {
  if (!currentSessionId) {
    console.log('No current session ID to match against');
    return null;
  }

  console.log('Looking for current session ID:', currentSessionId);
  console.log('Available sessions in payload:', compactPayload.s);

  // Check each session in the compact payload
  for (const [role, sessionId, sets] of compactPayload.s) {
    console.log(`Checking session: role=${role}, sessionId=${sessionId}, sets.length=${sets.length}`);
    
    if (sessionId === currentSessionId && sets.length > 0) {
      console.log(`Found matching session with workout data: ${sessionId}`);
      return {
        role: role as 'b' | 'c' | 'd',
        sessionId,
        sets,
      };
    }
  }

  console.log('No matching session found with workout data');
  return null;
}

// Check if this is a duplicate tap (same payload as before)
export function isDuplicateTap(
  currentPayload: CompactNFCPayload,
  lastPayload: CompactNFCPayload | null
): boolean {
  if (!lastPayload) return false;

  return (
    currentPayload.m === lastPayload.m &&
    currentPayload.a === lastPayload.a &&
    JSON.stringify(currentPayload.s) === JSON.stringify(lastPayload.s)
  );
}