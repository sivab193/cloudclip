import { Tabs } from 'expo-router';
import React from 'react';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';
import { useTheme } from '@/hooks/useTheme';
import { Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '@/auth/AuthContext';

export default function TabLayout() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
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
          position: 'absolute',
          backgroundColor: t.glass,
          height: 68, paddingBottom: 7, paddingTop: 5,
          borderTopColor: t.borderSubtle,
          borderTopWidth: 1,
          borderWidth: Platform.OS === 'web' ? 1 : 0,
          borderColor: t.border,
          borderRadius: Platform.OS === 'web' ? 22 : 0,
          width: Platform.OS === 'web' ? floatingWidth : '100%',
          left: Platform.OS === 'web' ? '50%' : 0,
          transform: Platform.OS === 'web' ? [{ translateX: -floatingWidth / 2 }] : undefined,
          bottom: Platform.OS === 'web' ? 18 : 0,
          shadowColor: t.shadow,
          shadowOpacity: 0.16,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 12 },
          elevation: 12,
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
