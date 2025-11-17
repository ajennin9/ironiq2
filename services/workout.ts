import { CompactNFCPayload, ExerciseSession, Set, ActiveSession, Workout } from '@/types/workout';
import { useWorkoutStore } from '@/stores/workout';
import { useAuthStore } from '@/stores/auth';
import { db } from './firebase';
import { collection, doc, setDoc, Timestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

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

    // Get or create active workout
    let workoutId = useWorkoutStore.getState().activeWorkoutId;
    if (!workoutId) {
      workoutId = await this.createWorkout();
    }

    const exerciseSession: ExerciseSession = {
      sessionId: activeSession.sessionId,
      userId,
      workoutId,
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
   * Create a new workout
   * Returns the workoutId
   */
  async createWorkout(): Promise<string> {
    const userId = useAuthStore.getState().user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const workoutId = doc(collection(db, 'users', userId, 'workouts')).id;
    const now = new Date();

    const workout: Workout = {
      workoutId,
      userId,
      startedAt: now.toISOString(),
      status: 'in-progress',
    };

    const workoutRef = doc(db, 'users', userId, 'workouts', workoutId);
    await setDoc(workoutRef, {
      ...workout,
      startedAt: Timestamp.fromDate(now),
    });

    // Save to store
    await useWorkoutStore.getState().setActiveWorkoutId(workoutId);

    return workoutId;
  }

  /**
   * Complete the active workout
   */
  async completeWorkout(): Promise<void> {
    const userId = useAuthStore.getState().user?.userId;
    const activeWorkoutId = useWorkoutStore.getState().activeWorkoutId;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    if (!activeWorkoutId) {
      throw new Error('No active workout found');
    }

    const workoutRef = doc(db, 'users', userId, 'workouts', activeWorkoutId);
    await setDoc(workoutRef, {
      endedAt: Timestamp.fromDate(new Date()),
      status: 'completed',
    }, { merge: true });

    // Clear from store
    await useWorkoutStore.getState().clearActiveWorkoutId();
  }

  /**
   * Get all exercises for a specific workout
   */
  async getExercisesForWorkout(workoutId: string): Promise<ExerciseSession[]> {
    const userId = useAuthStore.getState().user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const sessionsRef = collection(db, 'users', userId, 'exerciseSessions');
      const q = query(
        sessionsRef,
        where('workoutId', '==', workoutId),
        orderBy('startedAt', 'asc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
          endedAt: data.endedAt?.toDate?.()?.toISOString() || data.endedAt,
        } as ExerciseSession;
      });
    } catch (error) {
      console.error('Error fetching exercises for workout:', error);
      return [];
    }
  }

  /**
   * Get most recent workout for a specific exercise type
   * Returns the most recent ExerciseSession for the given machineType, or null if none found
   */
  async getMostRecentWorkoutForMachine(machineType: string): Promise<ExerciseSession | null> {
    const userId = useAuthStore.getState().user?.userId;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const sessionsRef = collection(db, 'users', userId, 'exerciseSessions');
      const q = query(
        sessionsRef,
        where('machineType', '==', machineType),
        orderBy('startedAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();

      // Convert Firestore Timestamps to ISO strings
      return {
        ...data,
        startedAt: data.startedAt?.toDate?.()?.toISOString() || data.startedAt,
        endedAt: data.endedAt?.toDate?.()?.toISOString() || data.endedAt,
      } as ExerciseSession;
    } catch (error) {
      console.error('Error fetching most recent workout:', error);
      return null;
    }
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
