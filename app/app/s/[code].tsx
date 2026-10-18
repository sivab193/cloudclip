import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import SharedContent from '@/components/SharedContent';

/** Short, code-only share route: `/s/A7K2`. */
export default function Page() {
  const params = useLocalSearchParams<{ code: string }>();
  const shareCode = typeof params.code === 'string' ? params.code.toUpperCase() : '';
  return <SharedContent shareCode={shareCode} />;
}
