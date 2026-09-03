import { colors } from '@court-proof/core';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/auth/AuthContext';

export default function Index() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return user ? <Redirect href="/home" /> : <Redirect href="/login" />;
}
