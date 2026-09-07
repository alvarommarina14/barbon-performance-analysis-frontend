import { colors, fonts } from '@barbon-performance-analysis/core';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.gray,
        tabBarStyle: { backgroundColor: colors.dark, borderTopColor: colors.line },
        tabBarLabelStyle: {
          fontFamily: fonts.body,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="analyses" options={{ title: 'Analysis' }} />
      <Tabs.Screen name="submit" options={{ title: 'Send' }} />
    </Tabs>
  );
}
