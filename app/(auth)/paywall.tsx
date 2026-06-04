import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { purchaseSubscription, restorePurchases } from '@/subscription/RevenueCatClient';
import { useSubscription } from '@/subscription/useSubscription';

export default function PaywallScreen() {
  const [loading, setLoading] = useState(false);
  const { refresh } = useSubscription();

  async function handleSubscribe() {
    setLoading(true);
    try {
      await purchaseSubscription('formiq_monthly');
      await refresh();
    } catch (e) {
      Alert.alert('Purchase failed', String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setLoading(true);
    try {
      await restorePurchases();
      await refresh();
    } catch (e) {
      Alert.alert('Restore failed', String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>FormIQ</Text>
        <Text style={styles.headline}>Train smarter.</Text>
        <Text style={styles.headline}>Lift better.</Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.price}>$9.99 / month</Text>
        <Text style={styles.priceNote}>Billed monthly · Cancel anytime</Text>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Start Subscription</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} style={styles.restore}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const FEATURES = [
  'Real-time skeleton overlay on camera',
  'Rep counting for 20+ exercises',
  'AI form analysis per rep',
  'Clinical coaching feedback after every set',
  'Full video playback with skeleton',
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 32, fontWeight: '800', color: '#111', marginBottom: 8 },
  headline: { fontSize: 36, fontWeight: '700', color: '#111', lineHeight: 44 },
  features: { marginVertical: 32, width: '100%', gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { fontSize: 18, color: '#111', fontWeight: '700' },
  featureText: { fontSize: 16, color: '#333' },
  price: { fontSize: 28, fontWeight: '700', color: '#111' },
  priceNote: { fontSize: 14, color: '#888', marginBottom: 24 },
  btn: {
    backgroundColor: '#111',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  restore: { marginTop: 16 },
  restoreText: { fontSize: 14, color: '#888' },
});
