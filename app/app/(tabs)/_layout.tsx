import { Tabs } from 'expo-router';
import React from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { useTheme } from '@/hooks/useTheme';
import { Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '@/auth/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const floating = Platform.OS === 'web' && width >= 720;
  const floatingWidth = Math.min(460, Math.max(280, width - 24));

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.25 },
        tabBarItemStyle: { paddingVertical: 7, borderRadius: 16 },
        tabBarInactiveTintColor: t.tabIconDefault,
        tabBarStyle: {
          display: user ? 'flex' : 'none',
          position: floating ? 'absolute' : 'relative',
          backgroundColor: t.glass,
          height: floating ? 68 : 64 + (Platform.OS === 'web' ? 0 : insets.bottom),
          paddingBottom: floating ? 7 : Math.max(6, Platform.OS === 'web' ? 0 : insets.bottom),
          paddingTop: 5,
          borderTopColor: t.borderSubtle,
          borderTopWidth: 1,
          borderWidth: floating ? 1 : 0,
          borderColor: t.border,
          borderRadius: floating ? 22 : 0,
          width: floating ? floatingWidth : '100%',
          left: floating ? '50%' : 0,
          transform: floating ? [{ translateX: -floatingWidth / 2 }] : undefined,
          bottom: floating ? 18 : 0,
          shadowColor: t.shadow,
          shadowOpacity: floating ? 0.16 : 0,
          shadowRadius: floating ? 28 : 0,
          shadowOffset: { width: 0, height: 12 },
          elevation: floating ? 12 : 0,
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sharedLinks"
        options={{
          title: 'Shared',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'share-social' : 'share-social-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'person-circle' : 'person-circle-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
