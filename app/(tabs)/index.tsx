import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>FormIQ</Text>
        <Text style={styles.subheading}>Track. Analyze. Improve.</Text>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/record/select')}
        >
          <Text style={styles.ctaText}>Start Workout</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Avg Form</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, alignItems: 'center' },
  heading: { fontSize: 36, fontWeight: '700', color: '#111', marginTop: 16 },
  subheading: { fontSize: 16, color: '#888', marginTop: 4, marginBottom: 40 },
  cta: {
    backgroundColor: '#111',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 14,
    marginBottom: 48,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
});
