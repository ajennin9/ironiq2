import { CompactNFCPayload, ExerciseSession, Set, ActiveSession } from '@/types/workout';
import { useWorkoutStore } from '@/stores/workout';
import { useAuthStore } from '@/stores/auth';
import { db } from './firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

class WorkoutService {
  /**
   * Start a new exercise session (tap-in)
   * Saves session to AsyncStorage and updates store
   */
  async startSession(payload: CompactNFCPayload): Promise<void> {
    const activeSession = useWorkoutStore.getState().activeSession;

    if (activeSession) {
      throw new Error('Active session already exists. Please tap out first.');
    }

    const newSession: ActiveSession = {
      sessionId: payload.a,
      machineId: payload.m,
      machineType: payload.t,
      startedAt: new Date().toISOString(),
    };

    await useWorkoutStore.getState().setActiveSession(newSession);
  }

  /**
   * Complete an exercise session (tap-out)
   * Finds matching session in payload, extracts workout data, saves to Firestore
   */
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

    // Get current user
    const userId = useAuthStore.getState().user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const exerciseSession: ExerciseSession = {
      sessionId: activeSession.sessionId,
      userId,
      workoutId: '', // MVP: no workout grouping
      machineId: activeSession.machineId,
      machineType: activeSession.machineType,
      startedAt: Timestamp.fromDate(startedAt).toDate().toISOString(),
      endedAt: Timestamp.fromDate(endedAt).toDate().toISOString(),
      duration,
      sets,
    };

    // Save to Firestore
    const sessionRef = doc(
      collection(db, 'users', userId, 'exerciseSessions'),
      sessionId
    );
    await setDoc(sessionRef, {
      ...exerciseSession,
      startedAt: Timestamp.fromDate(startedAt),
      endedAt: Timestamp.fromDate(endedAt),
    });

    // Clear active session
    await useWorkoutStore.getState().clearActiveSession();

    return exerciseSession;
  }

  /**
   * Clear active session (error handling)
   */
  async clearSession(): Promise<void> {
    await useWorkoutStore.getState().clearActiveSession();
  }

  /**
   * Find session in payload by ID
   * Returns matched session or null
   */
  private findSessionById(
    payload: CompactNFCPayload,
    sessionId: string
  ): [string, string, Array<[number, number]>] | null {
    return payload.s.find(session => session[1] === sessionId) || null;
  }

  /**
   * Convert compact sets format to ExerciseSession sets
   */
  private parseSets(compactSets: Array<[number, number]>): Set[] {
    return compactSets.map(([weightLbs, reps]) => ({
      weightLbs,
      reps,
    }));
  }
}

export const workoutService = new WorkoutService();
