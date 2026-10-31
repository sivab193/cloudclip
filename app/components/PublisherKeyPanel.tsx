import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { apiService } from '@/service/apiService';
import { PublisherKey } from '@/service/models';
import { setClipboard } from '@/service/clipboardService';
import { useFocusEffect } from 'expo-router';

interface Props {
    apiOrigin: string;
    onNotify: (message: string) => void;
    snippetFor: (apiOrigin: string, rawKey: string) => string;
}

export default function PublisherKeyPanel({ apiOrigin, onNotify, snippetFor }: Props) {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [keys, setKeys] = useState<PublisherKey[]>([]);
    const [label, setLabel] = useState('');
    const [creating, setCreating] = useState(false);
    const [revealed, setRevealed] = useState<PublisherKey | null>(null);
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    const refresh = useCallback(async () => {
        try {
            const result = await apiService.getPublisherKeys();
            if (mounted.current) setKeys(result);
        } catch {
            /* non-fatal */
        }
    }, []);

    useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

    const create = async () => {
        if (!label.trim()) { onNotify('Give the key a label.'); return; }
        setCreating(true);
        try {
            const created = await apiService.createPublisherKey(label.trim());
            setRevealed(created);
            setLabel('');
            void refresh();
        } catch (error) {
            onNotify(error instanceof Error ? error.message : 'Could not create the key.');
        } finally {
            if (mounted.current) setCreating(false);
        }
    };

    const revoke = async (key: PublisherKey) => {
        try {
            await apiService.deletePublisherKey(key.id);
            setKeys(prev => prev.filter(k => k.id !== key.id));
            onNotify('Publisher key revoked.');
        } catch (error) {
            onNotify(error instanceof Error ? error.message : 'Could not revoke the key.');
        }
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.cardIcon}><Ionicons name="terminal-outline" size={22} color={t.primary} /></View>
            <ThemedText type="defaultSemiBold" style={styles.heading}>Publish from an agent</ThemedText>
            <Text style={styles.hint}>Create a scoped publisher key and let a coding agent or CLI publish sites via the API.</Text>

            <View style={styles.createRow}>
                <TextInput style={styles.input} placeholder="Key label (e.g. My laptop CLI)" placeholderTextColor={t.placeholder} value={label} onChangeText={setLabel} />
                <TouchableOpacity style={[styles.createButton, creating && styles.disabled]} onPress={create} disabled={creating}>
                    {creating ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.createText}>Create key</Text>}
                </TouchableOpacity>
            </View>

            {revealed?.key && (
                <View style={styles.revealBox}>
                    <View style={styles.revealHead}>
                        <Ionicons name="warning-outline" size={16} color={t.accent} />
                        <Text style={styles.revealTitle}>Copy this key now — it is shown only once.</Text>
                    </View>
                    <View style={styles.keyRow}>
                        <Text selectable style={styles.keyText} numberOfLines={1}>{revealed.key}</Text>
                        <TouchableOpacity onPress={() => void setClipboard(revealed.key!, onNotify, 'Key copied')}><Ionicons name="copy-outline" size={18} color={t.primary} /></TouchableOpacity>
                    </View>
                    <Text style={styles.snippetLabel}>AGENT CONFIG</Text>
                    <View style={styles.snippetBox}>
                        <Text selectable style={styles.snippet}>{snippetFor(apiOrigin, revealed.key)}</Text>
                    </View>
                    <TouchableOpacity style={styles.copySnippet} onPress={() => void setClipboard(snippetFor(apiOrigin, revealed.key!), onNotify, 'Snippet copied')}>
                        <Ionicons name="copy-outline" size={15} color={t.primary} /><Text style={styles.copySnippetText}>Copy snippet</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.dismiss} onPress={() => setRevealed(null)}><Text style={styles.dismissText}>I've saved it</Text></TouchableOpacity>
                </View>
            )}

            {keys.length > 0 && (
                <View style={styles.keyList}>
                    {keys.map(key => (
                        <View key={key.id} style={styles.keyItem}>
                            <View style={styles.keyInfo}>
                                <Text style={styles.keyLabel} numberOfLines={1}>{key.label}</Text>
                                <Text style={styles.keyMeta}>{key.keyPrefix}…  ·  {key.lastUsedAt ? `used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'never used'}</Text>
                            </View>
                            <TouchableOpacity accessibilityLabel="Revoke key" style={styles.revoke} onPress={() => revoke(key)}>
                                <Ionicons name="trash-outline" size={18} color={t.icon} />
                                {Platform.OS === 'web' && <Text style={styles.revokeText}>Revoke</Text>}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </ThemedView>
    );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    container: { width: '100%', backgroundColor: t.glass, padding: 24, marginBottom: 18, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 24 },
    cardIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: t.primarySoft, marginBottom: 18 },
    heading: { marginBottom: 10, color: t.text, fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.6 },
    hint: { color: t.textMuted, fontSize: 12, lineHeight: 19, marginTop: -5, marginBottom: 18 },
    createRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input: { flex: 1, height: 50, borderColor: t.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, backgroundColor: t.surfaceAlt, color: t.text },
    createButton: { minHeight: 50, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.primaryStrong },
    createText: { color: t.onPrimary, fontSize: 13, fontWeight: '800' },
    disabled: { backgroundColor: t.surfaceDisabled },
    revealBox: { marginTop: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: t.accent, backgroundColor: t.accentSoft },
    revealHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    revealTitle: { color: t.text, fontSize: 12, fontWeight: '700' },
    keyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
    keyText: { flex: 1, color: t.text, fontSize: 12, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
    snippetLabel: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 16, marginBottom: 8 },
    snippetBox: { padding: 12, borderRadius: 10, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
    snippet: { color: t.text, fontSize: 11, lineHeight: 18, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
    copySnippet: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6 },
    copySnippetText: { color: t.primary, fontSize: 12, fontWeight: '700' },
    dismiss: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderRadius: 10, backgroundColor: t.surfaceDisabled },
    dismissText: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
    keyList: { marginTop: 18, gap: 10 },
    keyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
    keyInfo: { flex: 1, marginRight: 12 },
    keyLabel: { color: t.text, fontSize: 14, fontWeight: '600' },
    keyMeta: { color: t.textMuted, fontSize: 11, marginTop: 3 },
    revoke: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
    revokeText: { color: t.text, fontSize: 13 },
});
