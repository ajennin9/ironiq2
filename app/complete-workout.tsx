import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import Fonts from '@/constants/fonts';
import { useWorkoutStore } from '@/stores/workout';
import { workoutService } from '@/services/workout';
import { ExerciseSession } from '@/types/workout';

export default function CompleteWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const activeWorkoutId = useWorkoutStore(state => state.activeWorkoutId);

  const [exercises, setExercises] = useState<ExerciseSession[]>([]);
  const [workoutName, setWorkoutName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkoutData();
  }, [activeWorkoutId]);

  const loadWorkoutData = async () => {
    if (!activeWorkoutId) {
      Alert.alert('Error', 'No active workout found');
      router.back();
      return;
    }

    try {
      const exerciseData = await workoutService.getExercisesForWorkout(activeWorkoutId);
      setExercises(exerciseData);

      // Set default workout name
      const today = new Date();
      const defaultName = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()} workout`;
      setWorkoutName(defaultName);
    } catch (error: any) {
      console.error('Error loading workout data:', error);
      Alert.alert('Error', 'Failed to load workout data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalSets = () => {
    return exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  };

  const calculateTotalReps = () => {
    return exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => setTotal + set.reps, 0);
    }, 0);
  };

  const calculateTotalWeight = () => {
    return exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((setTotal, set) => setTotal + (set.weightLbs * set.reps), 0);
    }, 0);
  };

  const calculateWorkoutDuration = () => {
    if (exercises.length === 0) return 0;

    const startTimes = exercises.map(e => new Date(e.startedAt).getTime());
    const endTimes = exercises.map(e => new Date(e.endedAt).getTime());
    const earliest = Math.min(...startTimes);
    const latest = Math.max(...endTimes);

    return Math.floor((latest - earliest) / 1000 / 60); // minutes
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleSaveWorkout = async () => {
    try {
      await workoutService.completeWorkout(workoutName, notes);
      router.push('/(tabs)/history');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save workout');
      console.error('Error saving workout:', error);
    }
  };

  const handleDiscardWorkout = () => {
    Alert.alert(
      'Discard Workout?',
      'Are you sure you want to discard this workout? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeWorkoutId) {
                await workoutService.deleteWorkout(activeWorkoutId);
              }
              await useWorkoutStore.getState().clearActiveWorkoutId();
              router.push('/(tabs)/');
            } catch (error: any) {
              Alert.alert('Error', 'Failed to discard workout');
              console.error('Error discarding workout:', error);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Complete Workout</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Editable Workout Title */}
        <View style={styles.titleSection}>
          {isEditingName ? (
            <TextInput
              style={styles.titleInput}
              value={workoutName}
              onChangeText={setWorkoutName}
              onBlur={() => setIsEditingName(false)}
              autoFocus
              selectTextOnFocus
            />
          ) : (
            <TouchableOpacity
              style={styles.titleContainer}
              onPress={() => setIsEditingName(true)}
            >
              <Text style={styles.workoutTitle}>{workoutName}</Text>
              <Ionicons name="pencil" size={24} color={Colors.gold} />
            </TouchableOpacity>
          )}
        </View>

        {/* Workout Summary Stats */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calculateTotalSets()}</Text>
              <Text style={styles.summaryLabel}>Sets</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calculateTotalReps()}</Text>
              <Text style={styles.summaryLabel}>Reps</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{calculateTotalWeight().toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total lbs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatDuration(calculateWorkoutDuration())}</Text>
              <Text style={styles.summaryLabel}>Duration</Text>
            </View>
          </View>
        </View>

        {/* Exercise Sessions */}
        <Text style={styles.sectionTitle}>Exercises</Text>
        {exercises.map((exercise, index) => (
          <View key={exercise.sessionId} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.machineType}</Text>
              <Text style={styles.exerciseDuration}>
                {Math.floor(exercise.duration / 60)}m {exercise.duration % 60}s
              </Text>
            </View>
            <View style={styles.exerciseSets}>
              {exercise.sets.map((set, setIndex) => (
                <View key={setIndex} style={styles.exerciseSetRow}>
                  <Text style={styles.exerciseSetLabel}>Set {setIndex + 1}</Text>
                  <Text style={styles.exerciseSetValue}>
                    {set.reps} reps x {set.weightLbs} lbs
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Notes Field */}
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about your workout..."
          placeholderTextColor={Colors.navIconInactive}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Bottom spacing for fixed buttons */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={[styles.buttonContainer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={handleDiscardWorkout}
          activeOpacity={0.7}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveWorkout}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 100,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  backButton: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.text,
    flex: 1,
  },
  titleInput: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.text,
    borderBottomWidth: 2,
    borderBottomColor: Colors.gold,
    paddingBottom: 4,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.navIconInactive,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 24,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textTransform: 'capitalize',
  },
  exerciseDuration: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.navIconInactive,
  },
  exerciseSets: {
    width: '100%',
  },
  exerciseSetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseSetLabel: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
  },
  exerciseSetValue: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.navIconInactive,
  },
  notesInput: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
    minHeight: 100,
    marginBottom: 24,
  },
  bottomSpacer: {
    height: 80,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
  },
  discardButton: {
    backgroundColor: Colors.surface,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.red,
    height: 60,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  discardButtonText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.red,
  },
  saveButton: {
    backgroundColor: Colors.green,
    borderRadius: 100,
    height: 60,
    flex: 2,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  saveButtonText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.surface,
  },
});
