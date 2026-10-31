import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import { apiService } from '@/service/apiService';
import { PublishedSite, SiteVisibility } from '@/service/models';

interface Props {
    site: PublishedSite | null;
    onClose: () => void;
    onSaved: (updated: PublishedSite) => void;
    onError: (message: string) => void;
}

export default function SiteSettingsModal({ site, onClose, onSaved, onError }: Props) {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [displayName, setDisplayName] = useState('');
    const [visibility, setVisibility] = useState<SiteVisibility>('public');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (site) {
            setDisplayName(site.displayName);
            setVisibility(site.visibility);
            setPassword('');
        }
    }, [site]);

    if (!site) return null;

    const save = async () => {
        if (visibility === 'password' && site.visibility !== 'password' && !password.trim()) {
            onError('Set a password to enable protection.');
            return;
        }
        setSaving(true);
        try {
            const updated = await apiService.updateSite(site.id, {
                displayName: displayName.trim() || undefined,
                visibility,
                password: visibility === 'password' && password.trim() ? password : undefined,
            });
            onSaved(updated);
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Could not save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal transparent visible={Boolean(site)} animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View accessibilityViewIsModal style={styles.dialog}>
                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                        <View style={styles.headingRow}>
                            <Text style={styles.title}>Site settings</Text>
                            <TouchableOpacity accessibilityLabel="Close settings" onPress={onClose} style={styles.close}><Ionicons name="close" size={22} color={t.textMuted} /></TouchableOpacity>
                        </View>
                        <Text style={styles.url} numberOfLines={1}>{site.url}</Text>

                        <Text style={styles.label}>DISPLAY NAME</Text>
                        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="My Site" placeholderTextColor={t.placeholder} />

                        <Text style={styles.label}>ACCESS</Text>
                        <View style={styles.segment}>
                            <TouchableOpacity style={[styles.segmentOption, visibility === 'public' && styles.segmentOptionActive]} onPress={() => setVisibility('public')}>
                                <Ionicons name="globe-outline" size={16} color={visibility === 'public' ? t.primary : t.textMuted} />
                                <Text style={[styles.segmentText, visibility === 'public' && styles.segmentTextActive]}>Public</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.segmentOption, visibility === 'password' && styles.segmentOptionActive]} onPress={() => setVisibility('password')}>
                                <Ionicons name="lock-closed-outline" size={16} color={visibility === 'password' ? t.primary : t.textMuted} />
                                <Text style={[styles.segmentText, visibility === 'password' && styles.segmentTextActive]}>Password</Text>
                            </TouchableOpacity>
                        </View>
                        {visibility === 'password' && (
                            <>
                                <TextInput style={[styles.input, { marginTop: 10 }]} secureTextEntry value={password} onChangeText={setPassword}
                                    placeholder={site.visibility === 'password' ? 'Enter a new password to change it' : 'Set a viewer password'} placeholderTextColor={t.placeholder} />
                                <Text style={styles.note}>Password protection gates access. It is not end-to-end encryption.</Text>
                            </>
                        )}

                        <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving}>
                            {saving ? <ActivityIndicator color={t.onPrimary} /> : <Text style={styles.saveText}>Save changes</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: t.overlay },
    dialog: { width: '100%', maxWidth: 480, maxHeight: '92%', borderRadius: 16, backgroundColor: t.glass, borderWidth: 1, borderColor: t.border },
    scroll: { padding: 24 },
    headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    url: { color: t.textMuted, fontSize: 12, marginTop: 4 },
    label: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
    input: { height: 50, borderColor: t.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, backgroundColor: t.surfaceAlt, color: t.text },
    segment: { flexDirection: 'row', gap: 10 },
    segmentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt },
    segmentOptionActive: { borderColor: t.primary, backgroundColor: t.primarySoft },
    segmentText: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: t.primary },
    note: { color: t.textMuted, fontSize: 11, lineHeight: 17, marginTop: 8 },
    saveButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24, borderRadius: 12, backgroundColor: t.primaryStrong },
    saveText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' },
    disabled: { backgroundColor: t.surfaceDisabled },
});
