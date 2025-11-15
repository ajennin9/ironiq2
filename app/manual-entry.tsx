import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import Fonts from '@/constants/fonts';

export default function ManualEntryScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Manual Entry</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Placeholder Content */}
      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Manual entry screen - Coming soon
        </Text>
      </View>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.text,
    textAlign: 'center',
  },
});
