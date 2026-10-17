import React from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function AmbientBackdrop() {
  const t = useTheme();
  return (
    <div aria-hidden="true" className="cloudclip-ambient" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: t.background }}>
    </div>
  );
}
