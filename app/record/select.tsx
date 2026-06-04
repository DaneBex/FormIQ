import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllExercises } from '@/analysis/ExerciseRegistry';

export default function ExerciseSelectScreen() {
  const router = useRouter();
  const exercises = getAllExercises();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Choose Exercise</Text>
      <Text style={styles.sub}>Select what you're training today</Text>

      <FlatList
        data={exercises}
        keyExtractor={(e) => e.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/record/position?exercise=${item.id}`)}
          >
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardAngle}>{item.cameraAngle} view</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  heading: { fontSize: 28, fontWeight: '700', color: '#111', marginTop: 16 },
  sub: { fontSize: 14, color: '#888', marginBottom: 20 },
  grid: { paddingBottom: 24 },
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    padding: 20,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  cardName: { fontSize: 18, fontWeight: '700', color: '#111' },
  cardAngle: { fontSize: 12, color: '#888', marginTop: 4 },
});
