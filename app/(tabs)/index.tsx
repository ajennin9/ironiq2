import { View, Text, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import Colors from '@/constants/colors';
import { nfcService } from '@/services/nfc';
import { CompactNFCPayload } from '@/types/workout';

export default function HomeScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [lastScan, setLastScan] = useState<CompactNFCPayload | null>(null);

  // Initialize NFC on mount
  useEffect(() => {
    initializeNFC();
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
      setLastScan(payload);
      Alert.alert(
        'NFC Tag Read Successfully',
        `Machine: ${payload.m}\nType: ${payload.t}\nAction: ${payload.a}`
      );
    } catch (error: any) {
      // Don't show alert for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('invalidated')) {
        Alert.alert('Scan Failed', error.message || 'Failed to read NFC tag');
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home Screen</Text>
      <Text style={styles.subtitle}>Tap the button below to scan a workout machine</Text>

      <Button
        title={isScanning ? 'Scanning...' : 'Scan NFC Tag'}
        onPress={handleScan}
        disabled={isScanning || !nfcAvailable}
        variant="primary"
        style={styles.scanButton}
      />

      {lastScan && (
        <View style={styles.scanResult}>
          <Text style={styles.resultTitle}>Last Scan:</Text>
          <Text style={styles.resultText}>Machine ID: {lastScan.m}</Text>
          <Text style={styles.resultText}>Type: {lastScan.t}</Text>
          <Text style={styles.resultText}>Next Session: {lastScan.a}</Text>
          <Text style={styles.resultText}>
            Sessions: {lastScan.s.map(s => s[0]).join(', ')}
          </Text>
        </View>
      )}

      <Button
        title="Go to Profile"
        variant="outline"
        onPress={() => router.push('/profile')}
        style={styles.profileLink}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
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
  scanButton: {
    marginTop: 16,
    minWidth: 200,
  },
  scanResult: {
    marginTop: 32,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  profileLink: {
    marginTop: 32,
  },
});
