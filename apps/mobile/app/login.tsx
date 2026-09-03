import { colors, spacing } from '@court-proof/core';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { theme } from '@/ui/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      // Navigation is driven by the session: app/index redirects once `user` is set.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={theme.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={theme.eyebrow}>Barbon Performance</Text>
        <Text style={[theme.display, { marginTop: spacing.xs }]}>COURT PROOF</Text>
        <Text style={[theme.muted, { marginTop: spacing.sm, marginBottom: spacing.xl }]}>
          {isRegister
            ? 'Create your account to start sending videos.'
            : 'Sign in to see your analysis.'}
        </Text>

        {isRegister ? (
          <TextInput
            style={[theme.input, { marginBottom: spacing.md }]}
            placeholder="Full name"
            placeholderTextColor={colors.gray}
            autoCapitalize="words"
            autoComplete="name"
            value={name}
            onChangeText={setName}
          />
        ) : null}

        <TextInput
          style={[theme.input, { marginBottom: spacing.md }]}
          placeholder="Email"
          placeholderTextColor={colors.gray}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={theme.input}
          placeholder={isRegister ? 'Password (at least 10 characters)' : 'Password'}
          placeholderTextColor={colors.gray}
          autoCapitalize="none"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
        />

        {error ? <Text style={[theme.error, { marginTop: spacing.md }]}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            theme.primaryButton,
            { marginTop: spacing.xl, opacity: pressed || busy ? 0.7 : 1 },
          ]}
          disabled={busy}
          onPress={submit}
        >
          {busy ? (
            <ActivityIndicator color={colors.black} />
          ) : (
            <Text style={theme.primaryButtonLabel}>{isRegister ? 'Create account' : 'Sign in'}</Text>
          )}
        </Pressable>

        <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
          <Pressable
            onPress={() => {
              setMode(isRegister ? 'login' : 'register');
              setError(null);
            }}
          >
            <Text style={theme.muted}>
              {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
