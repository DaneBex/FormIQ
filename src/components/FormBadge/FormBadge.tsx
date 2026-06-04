import { View, Text, StyleSheet } from 'react-native';

interface Props {
  score: number; // 0–1
}

function scoreToColor(score: number): string {
  if (score >= 0.8) return '#4CAF50'; // green
  if (score >= 0.5) return '#FF9800'; // orange/yellow
  return '#F44336';                   // red
}

function scoreToLabel(score: number): string {
  if (score >= 0.8) return 'Good';
  if (score >= 0.5) return 'Fix Form';
  return 'Poor Form';
}

export function FormBadge({ score }: Props) {
  const color = scoreToColor(score);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{scoreToLabel(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '600' },
});
