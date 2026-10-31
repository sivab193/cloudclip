import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, Platform, ScrollView, useWindowDimensions, ActivityIndicator, Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Header from '@/components/Header';
import { useAuth } from '@/auth/AuthContext';
import { useFocusEffect } from 'expo-router';
import { apiService, API_ORIGIN } from '@/service/apiService';
import { PublishedSite, SiteVisibility } from '@/service/models';
import NoItemsComponent from '@/components/NoItems';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import useAccountGuard from '@/hooks/useAccountGuard';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import Reveal from '@/components/Reveal';
import { setClipboard } from '@/service/clipboardService';
import {
    PickedFile,
    pickSiteFile,
    normalizeSlug,
    slugError,
    previewSiteUrl,
    detectSourceType,
    formatBytes,
    publisherKeySnippet,
} from '@/service/sitesService';
import SiteSettingsModal from '@/components/SiteSettingsModal';
import PublisherKeyPanel from '@/components/PublisherKeyPanel';

type PublishStage = 'idle' | 'validating' | 'uploading' | 'live' | 'failed';

export default function Sites() {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { width } = useWindowDimensions();
    const wide = width >= 820;
    const compact = width < 600;
    const { user } = useAuth();
    const { capture } = useAccountGuard();

    const [sites, setSites] = useState<PublishedSite[]>([]);
    const [loading, setLoading] = useState(false);
    const [picked, setPicked] = useState<PickedFile | null>(null);
    const [slug, setSlug] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [visibility, setVisibility] = useState<SiteVisibility>('public');
    const [password, setPassword] = useState('');
    const [stage, setStage] = useState<PublishStage>('idle');
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [settingsSite, setSettingsSite] = useState<PublishedSite | null>(null);
    const [deleteSite, setDeleteSite] = useState<PublishedSite | null>(null);
    const [redeployId, setRedeployId] = useState<string | null>(null);

    const revision = useRef(0);
    const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (alertTimer.current) clearTimeout(alertTimer.current); }, []);

    const showAlert = (message: string) => {
        setAlertMessage(message);
        setAlertVisible(true);
        if (alertTimer.current) clearTimeout(alertTimer.current);
        alertTimer.current = setTimeout(() => setAlertVisible(false), 3200);
    };

    const fetchSites = useCallback(async () => {
        const valid = capture();
        if (!valid()) return;
        const started = revision.current;
        setLoading(true);
        try {
            const result = await apiService.getSites();
            if (valid() && started === revision.current) setSites(result);
        } catch {
            if (valid()) showAlert('Could not load your sites.');
        } finally {
            if (valid()) setLoading(false);
        }
    }, [capture]);

    useFocusEffect(useCallback(() => { void fetchSites(); }, [fetchSites]));
    useEffect(() => {
        revision.current++;
        setSites([]);
        resetPublishForm();
    }, [user?.uid]);

    const resetPublishForm = () => {
        setPicked(null);
        setSlug('');
        setDisplayName('');
        setVisibility('public');
        setPassword('');
        setStage('idle');
        setPublishedUrl(null);
    };

    const handlePick = async () => {
        try {
            const file = await pickSiteFile();
            if (!file) return;
            setPicked(file);
            setStage('idle');
            setPublishedUrl(null);
            if (!displayName) setDisplayName(file.name.replace(/\.(html?|zip)$/i, ''));
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'Could not read that file.');
        }
    };

    const handlePublish = async () => {
        const valid = capture();
        if (!picked) { showAlert('Choose an HTML file or ZIP build first.'); return; }
        const normalized = normalizeSlug(slug);
        const slugProblem = normalized ? slugError(normalized) : null;
        if (slugProblem) { showAlert(slugProblem); return; }
        if (visibility === 'password' && !password.trim()) { showAlert('Enter a password or switch to public.'); return; }

        setStage('validating');
        try {
            setStage('uploading');
            const result = await apiService.publishSite({
                source: picked.source,
                filename: picked.name,
                slug: normalized || undefined,
                displayName: displayName.trim() || undefined,
                visibility,
                password: visibility === 'password' ? password : undefined,
            });
            if (!valid()) return;
            revision.current++;
            setStage('live');
            setPublishedUrl(result.url);
            showAlert('Your site is live.');
            void fetchSites();
        } catch (error) {
            if (valid()) {
                setStage('failed');
                showAlert(error instanceof Error ? error.message : 'Publishing failed.');
            }
        }
    };

    const handleRedeploy = async (site: PublishedSite) => {
        try {
            const file = await pickSiteFile();
            if (!file) return;
            setRedeployId(site.id);
            const result = await apiService.redeploySite(site.id, file.source, file.name);
            setRedeployId(null);
            showAlert('Redeployed. The site URL is unchanged.');
            setPublishedUrl(result.url);
            void fetchSites();
        } catch (error) {
            setRedeployId(null);
            showAlert(error instanceof Error ? error.message : 'Redeploy failed.');
        }
    };

    const handleDelete = async () => {
        if (!deleteSite) return;
        try {
            await apiService.deleteSite(deleteSite.id);
            revision.current++;
            setSites(prev => prev.filter(s => s.id !== deleteSite.id));
            setDeleteSite(null);
            showAlert('Site deleted.');
        } catch (error) {
            setDeleteSite(null);
            showAlert(error instanceof Error ? error.message : 'Could not delete the site.');
        }
    };

    const openUrl = (url: string) => {
        if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
        else void Linking.openURL(url);
    };

    const sourceType = picked ? detectSourceType(picked.name) : 'unknown';
    const slugPreview = previewSiteUrl(normalizeSlug(slug));

    return (
        <>
            <Alert message={alertMessage} visible={alertVisible} />
            <Confirmation
                message={`Delete “${deleteSite?.displayName ?? ''}”?`}
                subtitle="The site URL will stop working immediately."
                visible={Boolean(deleteSite)}
                onDismiss={() => setDeleteSite(null)}
                buttons={[
                    { label: 'Cancel', onPress: () => setDeleteSite(null) },
                    { label: 'Delete', onPress: handleDelete, variant: 'danger' },
                ]}
            />
            <SiteSettingsModal
                site={settingsSite}
                onClose={() => setSettingsSite(null)}
                onSaved={(updated) => {
                    setSites(prev => prev.map(s => (s.id === updated.id ? updated : s)));
                    setSettingsSite(null);
                    showAlert('Settings saved.');
                }}
                onError={showAlert}
            />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <SafeAreaView style={styles.safeArea}>
                    <AmbientBackdrop />
                    <Header />
                    <Reveal>
                        <View style={[styles.page, compact && styles.pageCompact]}>
                            <View style={styles.hero}>
                                <View style={styles.eyebrowRow}><View style={styles.liveDot} /><Text style={styles.eyebrow}>HOSTED SITES · US BETA</Text></View>
                                <ThemedText style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Host a finished site.</ThemedText>
                                <ThemedText style={styles.heroSubtitle}>Upload an HTML file or ZIP build. CloudClip gives it a durable link anyone can open — no account needed to view.</ThemedText>
                                <Text style={styles.disclosure}>Hosted sites are public unless you add a password.</Text>
                            </View>

                            {/* Publish card */}
                            <ThemedView style={[styles.containerLight, compact && styles.containerCompact]}>
                                <View style={styles.cardIcon}><Ionicons name="cloud-upload-outline" size={22} color={t.primary} /></View>
                                <ThemedText type="defaultSemiBold" style={styles.heading}>Publish a site</ThemedText>
                                <Text style={styles.cardHint}>A ZIP must contain index.html at its root (or in one top-level folder).</Text>

                                <TouchableOpacity accessibilityRole="button" style={styles.pickButton} onPress={handlePick}>
                                    <Ionicons name="document-attach-outline" size={20} color={t.primary} />
                                    <Text style={styles.pickButtonText}>{picked ? 'Choose a different file' : 'Choose HTML or ZIP'}</Text>
                                </TouchableOpacity>

                                {picked && (
                                    <View style={styles.fileRow}>
                                        <Ionicons name={sourceType === 'zip' ? 'folder-outline' : 'document-text-outline'} size={18} color={t.textMuted} />
                                        <Text style={styles.fileName} numberOfLines={1}>{picked.name}</Text>
                                        <Text style={styles.fileMeta}>{sourceType.toUpperCase()} · {formatBytes(picked.size)}</Text>
                                    </View>
                                )}

                                <Text style={styles.fieldLabel}>URL SLUG</Text>
                                <TextInput
                                    accessibilityLabel="Site slug"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    style={styles.input}
                                    placeholder="my-site (leave blank for a random slug)"
                                    placeholderTextColor={t.placeholder}
                                    value={slug}
                                    onChangeText={setSlug}
                                />
                                <Text style={styles.urlPreview} numberOfLines={1}>{slugPreview}</Text>

                                <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
                                <TextInput
                                    accessibilityLabel="Display name"
                                    style={styles.input}
                                    placeholder="My Site"
                                    placeholderTextColor={t.placeholder}
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                />

                                <Text style={styles.fieldLabel}>ACCESS</Text>
                                <View style={styles.segment}>
                                    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: visibility === 'public' }} style={[styles.segmentOption, visibility === 'public' && styles.segmentOptionActive]} onPress={() => setVisibility('public')}>
                                        <Ionicons name="globe-outline" size={16} color={visibility === 'public' ? t.primary : t.textMuted} />
                                        <Text style={[styles.segmentText, visibility === 'public' && styles.segmentTextActive]}>Public</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity accessibilityRole="radio" accessibilityState={{ checked: visibility === 'password' }} style={[styles.segmentOption, visibility === 'password' && styles.segmentOptionActive]} onPress={() => setVisibility('password')}>
                                        <Ionicons name="lock-closed-outline" size={16} color={visibility === 'password' ? t.primary : t.textMuted} />
                                        <Text style={[styles.segmentText, visibility === 'password' && styles.segmentTextActive]}>Password</Text>
                                    </TouchableOpacity>
                                </View>
                                {visibility === 'password' && (
                                    <>
                                        <TextInput
                                            accessibilityLabel="Site password"
                                            secureTextEntry
                                            style={[styles.input, { marginTop: 10 }]}
                                            placeholder="Set a viewer password"
                                            placeholderTextColor={t.placeholder}
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                        <Text style={styles.passwordNote}>Password protection gates access. It is not end-to-end encryption.</Text>
                                    </>
                                )}

                                <TouchableOpacity
                                    accessibilityRole="button"
                                    style={[styles.publishButton, (!picked || stage === 'uploading' || stage === 'validating') && styles.buttonDisabled]}
                                    onPress={handlePublish}
                                    disabled={!picked || stage === 'uploading' || stage === 'validating'}
                                >
                                    {stage === 'uploading' || stage === 'validating'
                                        ? <ActivityIndicator color={t.onPrimary} />
                                        : <Ionicons name="rocket-outline" size={20} color={picked ? t.onPrimary : t.textDisabled} />}
                                    <Text style={[styles.publishButtonText, !picked && styles.buttonTextDisabled]}>
                                        {stage === 'validating' ? 'Validating…' : stage === 'uploading' ? 'Publishing…' : 'Publish'}
                                    </Text>
                                </TouchableOpacity>

                                {stage === 'live' && publishedUrl && (
                                    <View style={styles.liveBanner}>
                                        <Ionicons name="checkmark-circle" size={18} color={t.accent} />
                                        <Text style={styles.liveUrl} numberOfLines={1}>{publishedUrl}</Text>
                                        <TouchableOpacity onPress={() => void setClipboard(publishedUrl, showAlert, 'Link copied')}><Ionicons name="copy-outline" size={18} color={t.primary} /></TouchableOpacity>
                                        <TouchableOpacity onPress={() => openUrl(publishedUrl)}><Ionicons name="open-outline" size={18} color={t.primary} /></TouchableOpacity>
                                    </View>
                                )}

                                <Text style={styles.agentHint}>Prefer to publish from an agent? Create a publisher key below.</Text>
                            </ThemedView>

                            {/* Dashboard */}
                            <ThemedView style={[styles.containerLight, compact && styles.containerCompact]}>
                                <View style={styles.headingContainer}>
                                    <ThemedText type="defaultSemiBold">Your sites</ThemedText>
                                    {loading ? <ActivityIndicator color={t.primary} /> : null}
                                </View>
                                {sites.length > 0 ? (
                                    <View style={[styles.cardGrid, !wide && styles.cardGridStack]}>
                                        {sites.map(site => (
                                            <View key={site.id} style={styles.siteCard}>
                                                <View style={styles.siteCardTop}>
                                                    <Text style={styles.siteName} numberOfLines={1}>{site.displayName}</Text>
                                                    <View style={[styles.badge, site.visibility === 'password' ? styles.badgeLocked : styles.badgePublic]}>
                                                        <Ionicons name={site.visibility === 'password' ? 'lock-closed' : 'globe'} size={11} color={site.visibility === 'password' ? t.accent : t.primary} />
                                                        <Text style={[styles.badgeText, { color: site.visibility === 'password' ? t.accent : t.primary }]}>{site.visibility === 'password' ? 'Password' : 'Public'}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.siteUrl} numberOfLines={1}>{site.url}</Text>
                                                <View style={styles.siteActions}>
                                                    <TouchableOpacity accessibilityLabel="Open site" style={styles.siteAction} onPress={() => openUrl(site.url)}><Ionicons name="open-outline" size={20} color={t.icon} /></TouchableOpacity>
                                                    <TouchableOpacity accessibilityLabel="Copy link" style={styles.siteAction} onPress={() => void setClipboard(site.url, showAlert, 'Link copied')}><Ionicons name="copy-outline" size={20} color={t.icon} /></TouchableOpacity>
                                                    <TouchableOpacity accessibilityLabel="Redeploy" style={styles.siteAction} onPress={() => handleRedeploy(site)} disabled={redeployId === site.id}>
                                                        {redeployId === site.id ? <ActivityIndicator size="small" color={t.icon} /> : <Ionicons name="refresh-outline" size={20} color={t.icon} />}
                                                    </TouchableOpacity>
                                                    <TouchableOpacity accessibilityLabel="Settings" style={styles.siteAction} onPress={() => setSettingsSite(site)}><Ionicons name="settings-outline" size={20} color={t.icon} /></TouchableOpacity>
                                                    <TouchableOpacity accessibilityLabel="Delete" style={styles.siteAction} onPress={() => setDeleteSite(site)}><Ionicons name="trash-outline" size={20} color={t.icon} /></TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <NoItemsComponent />
                                )}
                            </ThemedView>

                            {/* Developer / publisher keys */}
                            <PublisherKeyPanel apiOrigin={API_ORIGIN} onNotify={showAlert} snippetFor={publisherKeySnippet} />
                        </View>
                    </Reveal>
                </SafeAreaView>
            </ScrollView>
        </>
    );
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: t.background, paddingTop: Platform.OS === 'web' ? 0 : 30, position: 'relative' },
    page: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 48, paddingBottom: 100 },
    pageCompact: { paddingTop: 28, paddingBottom: 36 },
    hero: { paddingHorizontal: 4, marginBottom: 26 },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
    liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: t.accent },
    eyebrow: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    heroTitle: { color: t.text, fontSize: 44, lineHeight: 49, fontWeight: '800', letterSpacing: -2 },
    heroTitleCompact: { fontSize: 34, lineHeight: 39, letterSpacing: -1.1 },
    heroSubtitle: { color: t.textMuted, fontSize: 15, lineHeight: 24, maxWidth: 580, marginTop: 12 },
    disclosure: { color: t.textMuted, fontSize: 12, marginTop: 10, fontStyle: 'italic' },
    containerLight: { width: '100%', backgroundColor: t.glass, padding: 24, marginBottom: 18, borderWidth: 1, borderColor: t.borderSubtle, borderRadius: 24, shadowColor: t.shadow, shadowOpacity: 0.065, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
    containerCompact: { padding: 18, borderRadius: 16, shadowOpacity: 0 },
    cardIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: t.primarySoft, marginBottom: 18 },
    heading: { marginBottom: 10, color: t.text, fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.6 },
    cardHint: { color: t.textMuted, fontSize: 12, lineHeight: 19, marginTop: -5, marginBottom: 18 },
    pickButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: t.primary, backgroundColor: t.primarySoft },
    pickButtonText: { color: t.primary, fontSize: 14, fontWeight: '700' },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
    fileName: { flex: 1, color: t.text, fontSize: 13, fontWeight: '600' },
    fileMeta: { color: t.textMuted, fontSize: 11, fontWeight: '700' },
    fieldLabel: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
    input: { height: 50, borderColor: t.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, backgroundColor: t.surfaceAlt, color: t.text },
    urlPreview: { color: t.primary, fontSize: 12, marginTop: 8, fontVariant: ['tabular-nums'] },
    segment: { flexDirection: 'row', gap: 10 },
    segmentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt },
    segmentOptionActive: { borderColor: t.primary, backgroundColor: t.primarySoft },
    segmentText: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
    segmentTextActive: { color: t.primary },
    passwordNote: { color: t.textMuted, fontSize: 11, lineHeight: 17, marginTop: 8 },
    publishButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 54, marginTop: 24, borderRadius: 14, backgroundColor: t.primaryStrong, shadowColor: t.primaryStrong, shadowOpacity: 0.24, shadowRadius: 14 },
    publishButtonText: { color: t.onPrimary, fontSize: 14, fontWeight: '800' },
    buttonDisabled: { backgroundColor: t.surfaceDisabled, shadowOpacity: 0 },
    buttonTextDisabled: { color: t.textDisabled },
    liveBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: t.accentSoft },
    liveUrl: { flex: 1, color: t.text, fontSize: 12 },
    agentHint: { color: t.textMuted, fontSize: 11, marginTop: 16, textAlign: 'center' },
    headingContainer: { marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
    cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    cardGridStack: { flexDirection: 'column' },
    siteCard: { flexGrow: 1, flexBasis: 300, minWidth: 260, padding: 16, borderRadius: 16, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.border },
    siteCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    siteName: { flex: 1, color: t.text, fontSize: 16, fontWeight: '700' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
    badgePublic: { backgroundColor: t.primarySoft },
    badgeLocked: { backgroundColor: t.accentSoft },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
    siteUrl: { color: t.textMuted, fontSize: 12, marginTop: 8 },
    siteActions: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14, justifyContent: 'space-between' },
    siteAction: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
});
