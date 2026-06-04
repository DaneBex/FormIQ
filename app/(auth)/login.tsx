import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithApple, signInWithGoogle, signInWithEmail } from '@/supabase/auth';
import { useUserStore } from '@/store/userStore';

export default function LoginScreen() {
  const setUser = useUserStore((s) => s.setUser);

  async function handleApple() {
    try {
      const user = await signInWithApple();
      if (user) setUser(user);
    } catch (e) {
      Alert.alert('Sign in failed', String(e));
    }
  }

  async function handleGoogle() {
    try {
      const user = await signInWithGoogle();
      if (user) setUser(user);
    } catch (e) {
      Alert.alert('Sign in failed', String(e));
    }
  }

  async function handleEmail() {
    // Demo: sign in with hardcoded test credentials for dev
    try {
      const user = await signInWithEmail('test@formiq.app', 'password123');
      if (user) setUser(user);
    } catch (e) {
      Alert.alert('Sign in failed', String(e));
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>FormIQ</Text>
        <Text style={styles.tagline}>Analyze your form. Perfect your technique.</Text>

        <View style={styles.buttons}>
          <TouchableOpacity style={[styles.btn, styles.btnApple]} onPress={handleApple}>
            <Text style={[styles.btnText, styles.btnTextLight]}> Sign in with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnGoogle]} onPress={handleGoogle}>
            <Text style={styles.btnText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnEmail]} onPress={handleEmail}>
            <Text style={styles.btnText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 48, fontWeight: '800', color: '#111', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 56 },
  buttons: { width: '100%', gap: 12 },
  btn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  btnApple: { backgroundColor: '#111', borderColor: '#111' },
  btnGoogle: { backgroundColor: '#fff' },
  btnEmail: { backgroundColor: '#f5f5f5', borderColor: '#f5f5f5' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#111' },
  btnTextLight: { color: '#fff' },
  legal: { marginTop: 32, fontSize: 12, color: '#bbb', textAlign: 'center' },
});
