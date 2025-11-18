import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import Fonts from '@/constants/fonts';
import { nfcService } from '@/services/nfc';
import { workoutService } from '@/services/workout';
import { useWorkoutStore } from '@/stores/workout';
import { CompactNFCPayload, ExerciseSession } from '@/types/workout';

export default function HomeScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [scanningDots, setScanningDots] = useState('');
  const [progressDots, setProgressDots] = useState('');
  const [previousWorkout, setPreviousWorkout] = useState<any>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(false);
  const [workoutExercises, setWorkoutExercises] = useState<ExerciseSession[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const activeSession = useWorkoutStore(state => state.activeSession);
  const activeWorkoutId = useWorkoutStore(state => state.activeWorkoutId);
  const initialize = useWorkoutStore(state => state.initialize);

  // Animation for glow effect
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Initialize NFC and workout store on mount
  useEffect(() => {
    initializeNFC();
    initialize();
  }, []);

  // Pulse animation for the dumbbell button
  useEffect(() => {
    if (!activeSession) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [activeSession]);

  // Animated dots for scanning screen
  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanningDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setScanningDots('');
    }
  }, [isScanning]);

  // Animated dots for exercise in progress
  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        setProgressDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgressDots('');
    }
  }, [activeSession]);

  // Fetch previous workout when session starts
  useEffect(() => {
    if (activeSession && !loadingWorkout) {
      setLoadingWorkout(true);
      workoutService.getMostRecentWorkoutForMachine(activeSession.machineType)
        .then(workout => {
          setPreviousWorkout(workout);
          setLoadingWorkout(false);
        })
        .catch(error => {
          console.error('Error fetching previous workout:', error);
          setLoadingWorkout(false);
        });
    } else if (!activeSession) {
      setPreviousWorkout(null);
      setLoadingWorkout(false);
    }
  }, [activeSession]);

  // Fetch exercises for active workout (continue workout state)
  useEffect(() => {
    if (activeWorkoutId && !activeSession && !loadingExercises) {
      setLoadingExercises(true);
      workoutService.getExercisesForWorkout(activeWorkoutId)
        .then(exercises => {
          setWorkoutExercises(exercises);
          setLoadingExercises(false);
        })
        .catch(error => {
          console.error('Error fetching workout exercises:', error);
          setLoadingExercises(false);
        });
    } else if (!activeWorkoutId) {
      setWorkoutExercises([]);
      setLoadingExercises(false);
    }
  }, [activeWorkoutId, activeSession]);

  const initializeNFC = async () => {
    const initialized = await nfcService.initialize();
    if (initialized) {
      const enabled = await nfcService.isEnabled();
      setNfcAvailable(enabled);
      if (!enabled) {
        Alert.alert(
          'NFC Disabled',
          'Please enable NFC in your device settings to use workout tracking features.'
        );
      }
    } else {
      Alert.alert(
        'NFC Not Available',
        'NFC is not supported on this device.'
      );
    }
  };

  const handleScan = async () => {
    if (!nfcAvailable) {
      Alert.alert('NFC Not Available', 'Please check your device settings.');
      return;
    }

    setIsScanning(true);
    try {
      const payload = await nfcService.readTag();

      if (activeSession) {
        // Tap-out flow
        try {
          await workoutService.completeSession(payload);
          // No alert - automatically show continue workout state
        } catch (error: any) {
          if (error.message.includes('not found')) {
            // Extract all session IDs from payload for debugging
            const sessionIds = payload.s.map((session: any) => `${session[0]}: ${session[1]}`).join('\n');
            Alert.alert(
              'Session Not Found',
              `Could not find your workout data. The session will be cleared.\n\nLooking for: ${activeSession.sessionId}\n\nAvailable sessions:\na: ${payload.a}\n${sessionIds}`,
              [
                {
                  text: 'OK',
                  onPress: () => workoutService.clearSession(),
                },
              ]
            );
          } else {
            throw error;
          }
        }
      } else {
        // Tap-in flow
        await workoutService.startSession(payload);
      }
    } catch (error: any) {
      // Don't show alert for user cancellation
      const errorMessage = error?.message?.toLowerCase() || '';
      const errorConstructor = error?.constructor?.name?.toLowerCase() || '';

      const isCancelled =
        errorConstructor.includes('usercancel') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('invalidated');

      if (!isCancelled) {
        Alert.alert('Error', error.message || 'An error occurred');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const formatDuration = (startedAt: string) => {
    const duration = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const formatRelativeTime = (dateString: string) => {
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    if (diffInSeconds < 60) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks === 1 ? '' : 's'} ago`;
    if (diffInMonths < 12) return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
    return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
  };

  const formatExerciseDuration = (startedAt: string, endedAt: string) => {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getMaxWeight = (sets: Array<{ weightLbs: number; reps: number }>) => {
    if (sets.length === 0) return 0;
    return Math.max(...sets.map(set => set.weightLbs));
  };

  const getTotalReps = (sets: Array<{ weightLbs: number; reps: number }>) => {
    return sets.reduce((total, set) => total + set.reps, 0);
  };

  const handleCompleteWorkout = () => {
    // TODO: Navigate to workout summary screen
    Alert.alert('Complete Workout', 'Workout summary screen coming soon!');
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>ironIQ</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Ionicons name="person-circle-outline" size={32} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isScanning && styles.scrollContentTop
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isScanning ? (
          // Scanning state
          <View style={styles.scanningContainer}>
            <Text style={styles.scanningTitle}>Scanning{scanningDots}</Text>

            <Text style={styles.scanningInstruction}>
              Tap your phone to the{'\n'}machine to start your{'\n'}workout.
            </Text>
          </View>
        ) : activeSession ? (
          // Active exercise state - showing current exercise in progress
          <View style={styles.exerciseInProgressContainer}>
            {/* Exercise in progress title */}
            <Text style={styles.exerciseInProgressTitle}>
              Exercise in progress{progressDots}
            </Text>

            {/* Active exercise card - tappable to complete exercise */}
            <TouchableOpacity
              style={styles.activeExerciseCard}
              onPress={handleScan}
              disabled={isScanning || !nfcAvailable}
              activeOpacity={0.7}
            >
              <View style={styles.activeExerciseContent}>
                <View style={styles.activeExerciseTextContainer}>
                  <Text style={styles.activeExerciseTitle}>{activeSession.machineType}</Text>
                  <Text style={styles.activeExerciseSubtitle}>Tap to complete exercise</Text>
                </View>
                <View style={styles.activeExerciseIconContainer}>
                  <Ionicons name="barbell" size={32} color={Colors.surface} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Conditional: First-time vs Returning user */}
            {previousWorkout ? (
              // Returning user - show most recent workout
              <View style={styles.recentWorkoutCard}>
                <View style={styles.recentWorkoutHeader}>
                  <View style={styles.recentWorkoutTitleContainer}>
                    <Text style={styles.recentWorkoutTitle}>Most Recent Workout</Text>
                    <Text style={styles.recentWorkoutExerciseName}>{previousWorkout.machineType}</Text>
                  </View>
                  <View style={styles.recentWorkoutTimeContainer}>
                    <Ionicons name="time-outline" size={35} color={Colors.gold} />
                    <Text style={styles.recentWorkoutTime}>
                      {formatRelativeTime(previousWorkout.endedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.recentWorkoutSets}>
                  {previousWorkout.sets.map((set: any, index: number) => (
                    <View key={index} style={styles.recentWorkoutSetRow}>
                      <Text style={styles.recentWorkoutSetLabel}>Set {index + 1}</Text>
                      <Text style={styles.recentWorkoutSetValue}>
                        {set.reps} reps x {set.weightLbs} lbs
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              // First-time user - show star icon and message
              <View style={styles.firstTimeCard}>
                <Ionicons name="star" size={64} color="#FFD700" />
                <Text style={styles.firstTimeText}>
                  First time on this machine!
                </Text>
                <Text style={styles.firstTimeSubtext}>
                  Your workout data will be saved{'\n'}when you tap to complete.
                </Text>
              </View>
            )}
          </View>
        ) : activeWorkoutId ? (
          // Continue workout state - workout in progress, no active exercise
          <>
            {/* Start Next Exercise Button */}
            <TouchableOpacity
              style={styles.startNextButton}
              onPress={handleScan}
              disabled={isScanning || !nfcAvailable}
              activeOpacity={0.7}
            >
              <View style={styles.startNextContent}>
                <View>
                  <Text style={styles.startNextTitle}>Start Next Exercise</Text>
                  <Text style={styles.startNextSubtitle}>Tap to start your next exercise</Text>
                </View>
                <View style={styles.dumbbellIconContainer}>
                  <Ionicons name="barbell" size={40} color={Colors.surface} />
                </View>
              </View>
            </TouchableOpacity>

            {/* Manual Entry Button */}
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => router.push('/manual-entry')}
              activeOpacity={0.7}
            >
              <View style={styles.manualEntryContent}>
                <View style={styles.manualEntryTextContainer}>
                  <Text style={styles.manualEntryTitle}>Manual Entry</Text>
                  <Text style={styles.manualEntrySubtitle}>
                    Record an exercise that doesn't{'\n'}use a smart machine.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.text} />
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.workoutDivider} />

            {/* Current Workout Section */}
            <Text style={styles.currentWorkoutTitle}>Current Workout</Text>

            {loadingExercises ? (
              <Text style={styles.loadingText}>Loading exercises...</Text>
            ) : workoutExercises.length === 0 ? (
              <Text style={styles.emptyText}>No exercises yet</Text>
            ) : (
              workoutExercises.map((exercise) => (
                <View key={exercise.sessionId} style={styles.workoutExerciseCard}>
                  <View style={styles.workoutExerciseHeader}>
                    <Text style={styles.workoutExerciseName}>{exercise.machineType}</Text>
                    <Text style={styles.workoutExerciseDuration}>
                      {formatExerciseDuration(exercise.startedAt, exercise.endedAt)}
                    </Text>
                  </View>

                  <View style={styles.workoutStatsRow}>
                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>{exercise.sets.length}</Text>
                      <Text style={styles.workoutStatLabel}>Sets</Text>
                    </View>

                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>{getTotalReps(exercise.sets)}</Text>
                      <Text style={styles.workoutStatLabel}>Total Reps</Text>
                    </View>

                    <View style={styles.workoutStat}>
                      <Text style={styles.workoutStatValue}>{getMaxWeight(exercise.sets)}</Text>
                      <Text style={styles.workoutStatLabel}>Max Weight</Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {/* Complete Workout Button */}
            <TouchableOpacity
              style={styles.finishWorkoutButton}
              onPress={handleCompleteWorkout}
              activeOpacity={0.7}
            >
              <Text style={styles.finishWorkoutText}>Complete Workout</Text>
              <Ionicons name="checkmark-circle" size={32} color={Colors.surface} />
            </TouchableOpacity>
          </>
        ) : (
          // Welcome state - no active session, no active workout
          <>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>It's workout time.</Text>

              <View style={styles.buttonContainer}>
                {/* Animated glow rings */}
                <Animated.View
                  style={[
                    styles.glowRing,
                    {
                      opacity: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0],
                      }),
                      transform: [
                        {
                          scale: glowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.glowRing,
                    styles.glowRingSecondary,
                    {
                      opacity: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.2, 0],
                      }),
                      transform: [
                        {
                          scale: glowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }),
                        },
                      ],
                    },
                  ]}
                />

                <TouchableOpacity
                  style={styles.barbellButton}
                  onPress={handleScan}
                  disabled={isScanning || !nfcAvailable}
                  activeOpacity={0.7}
                >
                  <Image
                    source={require('@/assets/icons/dumbell.png')}
                    style={styles.dumbbellIcon}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.instructionText}>
                Tap to start your workout{'\n'}at the first machine.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => router.push('/manual-entry')}
              activeOpacity={0.7}
            >
              <View style={styles.manualEntryContent}>
                <View style={styles.manualEntryTextContainer}>
                  <Text style={styles.manualEntryTitle}>Manual Entry</Text>
                  <Text style={styles.manualEntrySubtitle}>
                    Record an exercise that doesn't{'\n'}use a smart machine.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={Colors.text} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  profileButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 107, // 75px nav height + 16px bottom margin + 16px spacing - keeps content from being completely hidden
    justifyContent: 'center',
    flexGrow: 1,
  },
  scrollContentTop: {
    justifyContent: 'flex-start',
  },
  // SCANNING STATE
  scanningContainer: {
    alignItems: 'center',
    paddingTop: 32,
  },
  scanningTitle: {
    fontSize: 48,
    fontFamily: Fonts.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  scanningInstruction: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  // NEW DESIGN - Welcome state
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 48,
    fontFamily: Fonts.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 20,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  glowRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
  },
  glowRingSecondary: {
    // Secondary ring uses same base styles as glowRing
  },
  barbellButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  dumbbellIcon: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  instructionText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  manualEntryButton: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  manualEntryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  manualEntryTextContainer: {
    flex: 1,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  manualEntrySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  // EXISTING DESIGN - Active session state
  text: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  sessionInfo: {
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  machineType: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  sessionDetail: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scanButton: {
    marginTop: 16,
    minWidth: 200,
  },
  // NEW DESIGN - Exercise in progress state
  exerciseInProgressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  exerciseInProgressTitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  activeExerciseCard: {
    backgroundColor: Colors.text, // Black background
    borderRadius: 100,
    borderWidth: 3,
    borderColor: Colors.gold,
    height: 75,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  activeExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  activeExerciseTextContainer: {
    flex: 1,
    paddingLeft: 16,
    justifyContent: 'center',
  },
  activeExerciseTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.gold,
    textTransform: 'capitalize',
  },
  activeExerciseSubtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.navIconInactive,
  },
  activeExerciseIconContainer: {
    width: 59,
    height: 59,
    borderRadius: 100,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentWorkoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  recentWorkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  recentWorkoutTitleContainer: {
    flex: 1,
  },
  recentWorkoutTitle: {
    fontSize: 24,
    fontFamily: Fonts.regular,
    color: Colors.text,
    marginBottom: 4,
  },
  recentWorkoutExerciseName: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
  },
  recentWorkoutTimeContainer: {
    alignItems: 'flex-end',
  },
  recentWorkoutTime: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.navIconInactive,
    textAlign: 'right',
  },
  recentWorkoutSets: {
    width: '100%',
  },
  recentWorkoutSetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentWorkoutSetLabel: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
  },
  recentWorkoutSetValue: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.navIconInactive,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  workoutStat: {
    alignItems: 'center',
  },
  workoutStatValue: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  workoutStatLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },
  firstTimeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  firstTimeText: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  firstTimeSubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Continue Workout state
  startNextButton: {
    backgroundColor: '#00D46A',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#00FF7F',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  startNextContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startNextTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.surface,
    marginBottom: 4,
  },
  startNextSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dumbbellIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 24,
  },
  currentWorkoutTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 32,
  },
  workoutExerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  workoutExerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  workoutExerciseName: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  workoutExerciseDuration: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },
  finishWorkoutButton: {
    backgroundColor: '#00D46A',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 3,
    borderColor: '#00FF7F',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  finishWorkoutText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.surface,
  },
});
