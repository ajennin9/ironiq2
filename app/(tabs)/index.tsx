import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import Colors from '@/constants/colors';
import { nfcService } from '@/services/nfc';
import { workoutService } from '@/services/workout';
import { useWorkoutStore } from '@/stores/workout';
import { CompactNFCPayload } from '@/types/workout';

export default function HomeScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const activeSession = useWorkoutStore(state => state.activeSession);
  const initialize = useWorkoutStore(state => state.initialize);

  // Initialize NFC and workout store on mount
  useEffect(() => {
    initializeNFC();
    initialize();
  }, []);

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
          Alert.alert(
            'Workout Complete!',
            `Exercise: ${activeSession.machineType}\nDuration: ${formatDuration(activeSession.startedAt)}`
          );
        } catch (error: any) {
          if (error.message.includes('not found')) {
            Alert.alert(
              'Session Not Found',
              'Could not find your workout data. The session will be cleared.',
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
        Alert.alert(
          'Workout Started!',
          `Machine: ${payload.t}\nSession ID: ${payload.a}\n\nTap again when you finish your workout.`
        );
      }
    } catch (error: any) {
      // Don't show alert for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('invalidated')) {
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeSession ? (
          // Active session state (keep existing for now)
          <>
            <Text style={styles.text}>Workout In Progress</Text>
            <View style={styles.sessionInfo}>
              <Text style={styles.machineType}>{activeSession.machineType}</Text>
              <Text style={styles.sessionDetail}>Machine ID: {activeSession.machineId}</Text>
              <Text style={styles.sessionDetail}>Session: {activeSession.sessionId}</Text>
              <Text style={styles.sessionDetail}>
                Started: {new Date(activeSession.startedAt).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.subtitle}>Tap the machine again when you finish</Text>

            <Button
              title={isScanning ? 'Scanning...' : 'Tap to Complete Workout'}
              onPress={handleScan}
              disabled={isScanning || !nfcAvailable}
              variant="primary"
              style={styles.scanButton}
            />
          </>
        ) : (
          // Ready to start state - NEW DESIGN (with duplicate for scrolling test)
          <>
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>It's workout time.</Text>

              <TouchableOpacity
                style={styles.barbellButton}
                onPress={handleScan}
                disabled={isScanning || !nfcAvailable}
                activeOpacity={0.7}
              >
                <Ionicons name="barbell" size={80} color={Colors.surface} />
              </TouchableOpacity>

              <Text style={styles.instructionText}>
                Tap to start your workout{'\n'}at the first machine.
              </Text>
            </View>

            {/* Duplicate card for testing scrollable content */}
            <View style={[styles.welcomeCard, styles.duplicateCard]}>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>It's workout time.</Text>

              <TouchableOpacity
                style={styles.barbellButton}
                onPress={handleScan}
                disabled={isScanning || !nfcAvailable}
                activeOpacity={0.7}
              >
                <Ionicons name="barbell" size={80} color={Colors.surface} />
              </TouchableOpacity>

              <Text style={styles.instructionText}>
                Tap to start your workout{'\n'}at the first machine.
              </Text>
            </View>
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
    fontWeight: '700',
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
  // NEW DESIGN - Welcome state
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  duplicateCard: {
    marginTop: 24,
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 20,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 40,
  },
  barbellButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  instructionText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  // EXISTING DESIGN - Active session state
  text: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  sessionDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  scanButton: {
    marginTop: 16,
    minWidth: 200,
  },
});
