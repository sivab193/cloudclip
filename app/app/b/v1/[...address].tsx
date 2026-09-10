import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { extractText, parseBabelSegments } from '@/service/babelService';

export default function EternalLinkReader() {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { address } = useLocalSearchParams<{ address?: string | string[] }>();
    const result = useMemo(() => {
        try {
            const parts = Array.isArray(address) ? address : address ? [address] : [];
            const location = parseBabelSegments(parts);
            return { location, text: extractText(location), error: false as const };
        } catch {
            return { error: true as const };
        }
    }, [address]);

    return (
        <SafeAreaView style={styles.page}>
            <Stack.Screen options={{ title: result.error ? 'Invalid eternal link' : 'Eternal clip', headerShown: false }} />
            <AmbientBackdrop />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.brand}><Ionicons name="infinite" size={24} color={t.primary} /><Text style={styles.brandText}>CLOUDCLIP · ETERNAL LINK</Text></View>
                {result.error ? (
                    <View style={styles.card}>
                        <Ionicons name="alert-circle-outline" size={34} color={t.danger} />
                        <Text style={styles.title}>This eternal link is invalid</Text>
                        <Text style={styles.subtitle}>The Library of Babel address is incomplete or outside its valid range.</Text>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.badge}><Ionicons name="library-outline" size={15} color={t.accent} /><Text style={styles.badgeText}>Saved to the Library of Babel</Text></View>
                        <Text selectable style={styles.clip}>{result.text}</Text>
                        <View style={styles.rule} />
                        <Text style={styles.provenance}>Retrieved from the Library of Babel</Text>
                        <Text selectable style={styles.address}>Hex {result.location.hex} · Wall {result.location.wall} · Shelf {result.location.shelf} · Volume {result.location.volume} · Page {result.location.page} · Offset {result.location.offset} · Length {result.location.length}</Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    page: { flex: 1, backgroundColor: t.background },
    content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 22, paddingVertical: 70 },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 22 },
    brandText: { color: t.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
    card: { width: '100%', maxWidth: 820, padding: 28, borderRadius: 24, backgroundColor: t.glass, borderWidth: 1, borderColor: t.borderSubtle, gap: 14 },
    badge: { alignSelf: 'flex-start', flexDirection: 'row', gap: 7, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 11, borderRadius: 99, backgroundColor: t.primarySoft },
    badgeText: { color: t.text, fontSize: 11, fontWeight: '700' },
    clip: { color: t.text, fontSize: 17, lineHeight: 28, marginVertical: 12 },
    rule: { height: 1, backgroundColor: t.borderSubtle },
    provenance: { color: t.accent, fontSize: 12, fontWeight: '700', marginTop: 4 },
    address: { color: t.textMuted, fontFamily: 'SpaceMono', fontSize: 10, lineHeight: 17 },
    title: { color: t.text, fontSize: 26, fontWeight: '800' },
    subtitle: { color: t.textMuted, fontSize: 15, lineHeight: 23 },
});
