import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveSession } from '@/types/workout';

const ACTIVE_SESSION_KEY = '@ironiq/activeSession';
const ACTIVE_WORKOUT_ID_KEY = '@ironiq/activeWorkoutId';

interface WorkoutState {
  activeSession: ActiveSession | null;
  activeWorkoutId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  setActiveSession: (session: ActiveSession) => Promise<void>;
  clearActiveSession: () => Promise<void>;
  setActiveWorkoutId: (workoutId: string) => Promise<void>;
  clearActiveWorkoutId: () => Promise<void>;
  clearError: () => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeSession: null,
  activeWorkoutId: null,
  isLoading: false,
  error: null,

  initialize: async () => {
    try {
      const sessionJson = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
      const workoutId = await AsyncStorage.getItem(ACTIVE_WORKOUT_ID_KEY);

      if (sessionJson) {
        const session = JSON.parse(sessionJson) as ActiveSession;
        set({ activeSession: session, activeWorkoutId: workoutId, error: null });
      } else if (workoutId) {
        set({ activeWorkoutId: workoutId, error: null });
      }
    } catch (error: any) {
      console.error('Failed to load active session:', error);
      set({ error: error.message || 'Failed to load active session' });
    }
  },

  setActiveSession: async (session: ActiveSession) => {
    try {
      await AsyncStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
      set({ activeSession: session, error: null });
    } catch (error: any) {
      console.error('Failed to save active session:', error);
      set({ error: error.message || 'Failed to save active session' });
      throw error;
    }
  },

  clearActiveSession: async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_SESSION_KEY);
      set({ activeSession: null, error: null });
    } catch (error: any) {
      console.error('Failed to clear active session:', error);
      set({ error: error.message || 'Failed to clear active session' });
      throw error;
    }
  },

  setActiveWorkoutId: async (workoutId: string) => {
    try {
      await AsyncStorage.setItem(ACTIVE_WORKOUT_ID_KEY, workoutId);
      set({ activeWorkoutId: workoutId, error: null });
    } catch (error: any) {
      console.error('Failed to save active workout ID:', error);
      set({ error: error.message || 'Failed to save active workout ID' });
      throw error;
    }
  },

  clearActiveWorkoutId: async () => {
    try {
      await AsyncStorage.removeItem(ACTIVE_WORKOUT_ID_KEY);
      set({ activeWorkoutId: null, error: null });
    } catch (error: any) {
      console.error('Failed to clear active workout ID:', error);
      set({ error: error.message || 'Failed to clear active workout ID' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
