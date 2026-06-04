import { supabase } from './client';
import { AppUser } from '../store/userStore';

export async function signInWithApple(): Promise<AppUser | null> {
  // Apple sign-in requires native integration via expo-apple-authentication
  // Placeholder — wire up in Phase 1 native build
  throw new Error('Apple sign-in requires a native build (expo-apple-authentication).');
}

export async function signInWithGoogle(): Promise<AppUser | null> {
  // Google sign-in requires OAuth redirect via Supabase
  // Placeholder — wire up with expo-auth-session in Phase 1
  throw new Error('Google sign-in requires a native build with OAuth config.');
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AppUser | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  if (!data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    displayName: data.user.user_metadata?.full_name,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
