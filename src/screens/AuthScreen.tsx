// AuthScreen — port of lib/screens/auth_screen.dart (core login/signup/guest flow).
// Advanced DB/Supabase config lives in Settings (Phase 6); here we use the store's
// current syncSettings. Wired to store.authenticate / continueAsGuest.
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react-native';
import ThemedBackdrop from '../ui/ThemedBackdrop';
import GlassPanel from '../ui/GlassPanel';
import SparkleMark from '../ui/SparkleMark';
import SegmentedPills from '../ui/SegmentedPills';
import { useAppTheme } from '../ui/theme';
import { useAppStore } from '../state/store';

export default function AuthScreen() {
  const { palette: p } = useAppTheme();
  const authenticate = useAppStore((s) => s.authenticate);
  const continueAsGuest = useAppStore((s) => s.continueAsGuest);
  const syncStatus = useAppStore((s) => s.syncStatus);

  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async () => {
    setError('');
    if (username.trim().length === 0 || password.length === 0) {
      setError('Enter a username and password.');
      return;
    }
    setBusy(true);
    try {
      await authenticate(username.trim(), password, { signUp: mode === 'signup' });
    } catch (e) {
      setError((e as Error).message.replace(/^Exception:\s*/, ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <ThemedBackdrop />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.logoRow}>
              <SparkleMark size={64} />
            </View>
            <Text style={[styles.title, { color: p.onSurface }]}>AdoetzGPT</Text>
            <Text style={[styles.subtitle, { color: p.onSurfaceVariant }]}>
              {mode === 'signin' ? 'Welcome back. Sign in to sync.' : 'Create an account to sync your chats.'}
            </Text>

            <GlassPanel padding={20} style={{ width: '100%', maxWidth: 460 }}>
              <SegmentedPills
                value={mode}
                onChange={setMode}
                items={[
                  { value: 'signin', label: 'Sign in' },
                  { value: 'signup', label: 'Create account' },
                ]}
              />

              <Text style={[styles.label, { color: p.onSurfaceVariant }]}>Username or email</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor={p.onSurfaceVariant}
                style={[styles.input, { color: p.onSurface, borderColor: p.outline, borderRadius: p.controlRadius, backgroundColor: p.surfaceDim }]}
              />

              <Text style={[styles.label, { color: p.onSurfaceVariant }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={p.onSurfaceVariant}
                style={[styles.input, { color: p.onSurface, borderColor: p.outline, borderRadius: p.controlRadius, backgroundColor: p.surfaceDim }]}
              />

              {error.length > 0 && (
                <View style={[styles.errorBox, { backgroundColor: p.error }]}>
                  <AlertCircle size={16} color="#FFFFFF" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={submit}
                disabled={busy}
                style={[styles.primary, { backgroundColor: busy ? p.surfaceDim : p.primary, borderRadius: p.controlRadius, opacity: busy ? 0.6 : 1 }]}
              >
                {mode === 'signin' ? <LogIn size={18} color="#FFFFFF" /> : <UserPlus size={18} color="#FFFFFF" />}
                <Text style={styles.primaryText}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
              </Pressable>

              <Pressable onPress={continueAsGuest} style={styles.guestBtn}>
                <Text style={[styles.guestText, { color: p.primary }]}>Continue as Guest</Text>
              </Pressable>
            </GlassPanel>

            {syncStatus.length > 0 && (
              <Text style={[styles.status, { color: p.onSurfaceVariant }]}>{syncStatus}</Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, alignItems: 'center', justifyContent: 'center' },
  logoRow: { marginBottom: 18 },
  title: { fontSize: 32, fontWeight: '800', fontFamily: 'HankenGrotesk_800ExtraBold', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 24, fontWeight: '500', textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '700', marginTop: 16, marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, marginTop: 14 },
  errorText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', flex: 1 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, marginTop: 16 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  guestBtn: { alignItems: 'center', marginTop: 14, paddingVertical: 8 },
  guestText: { fontSize: 14, fontWeight: '600' },
  status: { fontSize: 12, marginTop: 18, textAlign: 'center' },
});
