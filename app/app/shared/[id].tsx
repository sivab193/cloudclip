import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import SharedContent from '@/components/SharedContent';

/**
 * Legacy share-link route: `/shared/<token>`, which leaked the token to the
 * web host in the request path. Kept so links already in circulation still
 * resolve — new links are minted as `/shared#<token>` (see shareService).
 */
export default function Page() {
  const params = useLocalSearchParams<{ id: string }>();
  const legacyToken = typeof params.id === 'string' ? params.id : '';
  return <SharedContent legacyToken={legacyToken} />;
}
