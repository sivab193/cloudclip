import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { passwordAssessment } from '@/utils/passwordStrength';

export default function PasswordStrength({ password, personalWords = [] }: { password: string; personalWords?: string[] }) {
  const t = useTheme();
  const assessment = useMemo(() => passwordAssessment(password, personalWords), [password, personalWords.join('|')]);
  if (!password) return <Text style={[styles.hint, { color: t.textMuted }]}>Use 12+ characters. A unique passphrase is easy to remember.</Text>;
  const label = assessment.acceptable ? (assessment.score >= 4 ? 'Strong' : 'Good') : 'Needs work';
  const color = assessment.acceptable ? t.accent : t.danger;
  const filledSegments = password.length < 12 ? 1 : Math.max(1, assessment.score);
  return <View accessibilityLiveRegion="polite" style={styles.wrap}>
    <View style={styles.row}>
      <Text style={[styles.label, { color: t.textMuted }]}>Password strength</Text>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
    <View style={styles.meter} accessibilityLabel={`Password strength: ${label}`}>
      {[0, 1, 2, 3].map(index => <View key={index} style={[styles.segment, { backgroundColor: index < filledSegments ? color : t.surfaceDisabled }]} />)}
    </View>
    <Text style={[styles.hint, { color: t.textMuted }]}>{assessment.hint}</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 7, marginTop: -3, marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12, fontWeight: '700' },
  meter: { flexDirection: 'row', gap: 5, height: 5 },
  segment: { flex: 1, borderRadius: 5 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
});
