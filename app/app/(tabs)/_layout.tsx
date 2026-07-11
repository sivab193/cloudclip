import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'black',
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#151718' : '#ffffff',
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