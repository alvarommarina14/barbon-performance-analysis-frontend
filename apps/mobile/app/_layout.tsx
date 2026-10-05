import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { colors, fonts } from '@barbon-performance-analysis/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider } from '@/auth/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function RootLayout() {
  // The token names must match @barbon-performance-analysis/core's `fonts`, which is what every style refers to.
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
    DMSans: DMSans_400Regular,
    DMSansMedium: DMSans_500Medium,
    DMSansBold: DMSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.black },
          }}
        >
          <Stack.Screen
            name="analysis/[id]"
            options={{
              headerShown: true,
              title: 'Analysis',
              headerTitleAlign: 'center',
              headerStyle: { backgroundColor: colors.black },
              headerShadowVisible: false,
              headerTintColor: colors.accent,
              headerTitleStyle: {
                color: colors.white,
                fontFamily: fonts.display,
                fontSize: 20,
              },
              // iOS: drop the "(tabs)" label next to the chevron — just the arrow.
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="recording-tips"
            options={{
              headerShown: true,
              title: 'Recording tips',
              headerTitleAlign: 'center',
              headerStyle: { backgroundColor: colors.black },
              headerShadowVisible: false,
              headerTintColor: colors.accent,
              headerTitleStyle: {
                color: colors.white,
                fontFamily: fonts.display,
                fontSize: 20,
              },
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="strength"
            options={{
              headerShown: true,
              title: 'Strength & conditioning',
              headerTitleAlign: 'center',
              headerStyle: { backgroundColor: colors.black },
              headerShadowVisible: false,
              headerTintColor: colors.accent,
              headerTitleStyle: {
                color: colors.white,
                fontFamily: fonts.display,
                fontSize: 20,
              },
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="warmup-recovery"
            options={{
              headerShown: true,
              title: 'Warm-up & recovery',
              headerTitleAlign: 'center',
              headerStyle: { backgroundColor: colors.black },
              headerShadowVisible: false,
              headerTintColor: colors.accent,
              headerTitleStyle: {
                color: colors.white,
                fontFamily: fonts.display,
                fontSize: 20,
              },
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: '',
            }}
          />
          <Stack.Screen
            name="strength/[dayId]"
            options={{
              headerShown: true,
              title: 'Training day',
              headerTitleAlign: 'center',
              headerStyle: { backgroundColor: colors.black },
              headerShadowVisible: false,
              headerTintColor: colors.accent,
              headerTitleStyle: {
                color: colors.white,
                fontFamily: fonts.display,
                fontSize: 20,
              },
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitle: '',
            }}
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
