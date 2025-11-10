import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { User } from '@/types/workout';

interface AuthState {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  initialize: () => void;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePreferences: (preferredWeightUnit: 'lbs' | 'kg') => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: () => {
    // Listen to auth state changes
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch user data from Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            set({
              user: userData,
              firebaseUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            // User document doesn't exist (shouldn't happen, but handle it)
            console.error('User document not found in Firestore');
            set({
              user: null,
              firebaseUser: null,
              isAuthenticated: false,
              isLoading: false,
              error: 'User data not found',
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          set({
            user: null,
            firebaseUser: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Failed to load user data',
          });
        }
      } else {
        // User is signed out
        set({
          user: null,
          firebaseUser: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      }
    });
  },

  signUp: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const userData: User = {
        userId: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        preferredWeightUnit: 'lbs', // Default
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      set({
        user: userData,
        firebaseUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to sign up',
      });
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user state
    } catch (error: any) {
      console.error('Sign in error:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to sign in',
      });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle clearing the user state
    } catch (error: any) {
      console.error('Sign out error:', error);
      set({
        isLoading: false,
        error: error.message || 'Failed to sign out',
      });
      throw error;
    }
  },

  updatePreferences: async (preferredWeightUnit: 'lbs' | 'kg') => {
    const { user } = get();
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Update in Firestore
      await updateDoc(doc(db, 'users', user.userId), {
        preferredWeightUnit,
      });

      // Update local state
      set({
        user: {
          ...user,
          preferredWeightUnit,
        },
      });
    } catch (error: any) {
      console.error('Update preferences error:', error);
      set({ error: error.message || 'Failed to update preferences' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
