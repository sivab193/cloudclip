import React from 'react';
import SharedContent from '@/components/SharedContent';

/**
 * Current share-link route: `/shared#<token>`. The token rides in the URL
 * fragment so it never reaches the web host's access logs.
 */
export default function Page() {
  return <SharedContent />;
}
