import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/Button';
import Colors from '@/constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const updatePreferences = useAuthStore((state) => state.updatePreferences);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (error: any) {
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleWeightUnitToggle = async () => {
    const newUnit = user.preferredWeightUnit === 'lbs' ? 'kg' : 'lbs';
    try {
      await updatePreferences(newUnit);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update weight unit preference');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user.displayName}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.preferenceRow}>
          <View style={styles.preferenceInfo}>
            <Text style={styles.label}>Weight Unit</Text>
            <Text style={styles.preferenceSubtext}>
              Choose how weights are displayed
            </Text>
          </View>
          <Button
            title={user.preferredWeightUnit.toUpperCase()}
            onPress={handleWeightUnitToggle}
            variant="outline"
            size="small"
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  preferenceInfo: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  preferenceSubtext: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  actions: {
    padding: 24,
    marginTop: 32,
  },
});
