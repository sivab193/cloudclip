import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

interface ShareQrCodeProps {
  url: string;
  maxSize?: number;
}

export default function ShareQrCode({ url, maxSize = 184 }: ShareQrCodeProps) {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const size = Math.max(132, Math.min(maxSize, width - 128));

  return (
    <View accessibilityLabel="QR code for the shared CloudClip link" style={styles.container}>
      <View style={styles.qrFrame}>
        <QRCode value={url} size={size} color="#1d2530" backgroundColor="#ffffff" quietZone={5} />
      </View>
      <Text style={styles.hint}>Scan to open this clip</Text>
    </View>
  );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
  container: { alignItems: 'center' },
  qrFrame: { padding: 10, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: t.border },
  hint: { color: t.textMuted, fontSize: 12, lineHeight: 18, marginTop: 9 },
});
