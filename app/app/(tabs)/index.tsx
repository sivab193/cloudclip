import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Platform, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Header from '@/components/Header';
import Description from '@/components/Description';
import { useAuth } from '@/auth/AuthContext';
import ClipboardScreen from '@/components/Clipboard';
import { getClipboard, setClipboard } from '@/service/clipboardService';
import useClipboardSync from '@/hooks/useClipboardSync';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import Reveal from '@/components/Reveal';

export default function Homepage() {
 const t = useTheme();
 const styles = useThemedStyles(makeStyles);
 const [saveTextData, setSaveTextData] = useState('');
 const [alertVisible, setAlertVisible] = useState(false);
 const [alertMessage, setAlertMessage] = useState('');
 const [confirmationVisible, setConfirmationVisible] = useState(false);
 const [legacyPromptVisible, setLegacyPromptVisible] = useState(false);
 const { user } = useAuth();
 const { width } = useWindowDimensions();
 const wide = width >= 860;
 const legacyPromptShownRef = useRef(false);
 const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 const showAlert = useCallback((message: string) => {
  setAlertMessage(message);
  setAlertVisible(true);
  if (alertTimer.current) clearTimeout(alertTimer.current);
  alertTimer.current = setTimeout(() => setAlertVisible(false), 3000);
 }, []);
 const { entries: clipboardEntries, save, remove, clear } = useClipboardSync(showAlert);
 const latestText = clipboardEntries[0]?.unreadable ? null : clipboardEntries[0]?.content ?? null;
 useEffect(() => {
  setSaveTextData('');
  legacyPromptShownRef.current = false;
  setLegacyPromptVisible(false);
 }, [user?.uid]);
 useEffect(() => () => { if (alertTimer.current) clearTimeout(alertTimer.current); }, []);
 useEffect(() => {
  if (!legacyPromptShownRef.current && clipboardEntries.some(entry => entry.legacy)) {
   legacyPromptShownRef.current = true;
   setLegacyPromptVisible(true);
  }
 }, [clipboardEntries]);
 const handleCopy = (text: string) => { void setClipboard(text, showAlert, 'Copied to clipboard'); };
 const handlePaste = async () => {
  try { setSaveTextData(await getClipboard()); }
  catch { showAlert('Clipboard access was blocked. Paste into the text field instead.'); }
 };
 const handleSave = async (text: string) => {
  try {
   if (await save(text)) { setSaveTextData(''); showAlert('Text saved to your clipboard history'); }
  } catch (error) { showAlert(error instanceof Error ? error.message : 'Could not save; try again'); }
 };
 const handleBulkDelete = async () => {
  try { await clear(); showAlert('Deleted all clipboard entries'); }
  catch { showAlert('Failed to delete entries; try again'); }
 };
 const handleDeleteLegacy = async () => {
  setLegacyPromptVisible(false);
  try {
   for (const entry of clipboardEntries.filter(item => item.legacy)) await remove(entry._id || entry.id || '');
   showAlert('Old unencrypted entries deleted');
  } catch { showAlert('Failed to delete some old entries'); }
 };
	return (
		<>
			<Alert message={alertMessage} visible={alertVisible} />
			<Confirmation
				message="Delete all clipboard entries?"
				subtitle="This removes them from all your devices."
				visible={confirmationVisible}
				onDismiss={() => setConfirmationVisible(false)}
				buttons={[
					{ label: 'No', onPress: () => setConfirmationVisible(false) },
					{ label: 'Yes', onPress: () => { setConfirmationVisible(false); handleBulkDelete(); } },
				]}
			/>
			<Confirmation
				message="Old unencrypted entries found"
				subtitle="Entries saved before encryption was enabled are stored unencrypted. Delete them?"
				visible={legacyPromptVisible}
				onDismiss={() => setLegacyPromptVisible(false)}
				buttons={[
					{ label: 'Keep', onPress: () => setLegacyPromptVisible(false) },
					{ label: 'Delete', onPress: handleDeleteLegacy, variant: 'danger' },
				]}
			/>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false}
				horizontal={false}
			>
				<SafeAreaView style={styles.safeArea}>
					<AmbientBackdrop />
					<Header />
					<ThemedView style={styles.centerContainer}>
						{!user ? (
							<Description />
						) : (
							<Reveal>
							<View style={styles.workspace}>
								<View style={styles.workspaceHero}>
									<View style={styles.eyebrowRow}><View style={styles.liveDot} /><Text style={styles.eyebrow}>YOUR SECURE WORKSPACE</Text></View>
									<ThemedText style={styles.workspaceTitle}>Good to see you.</ThemedText>
									<ThemedText style={styles.workspaceSubtitle}>Move ideas between your devices without breaking your flow.</ThemedText>
									<View style={styles.metrics}>
										<View style={styles.metric}><Ionicons name="layers-outline" size={17} color={t.primary} /><Text style={styles.metricValue}>{clipboardEntries.length}</Text><Text style={styles.metricLabel}>clips</Text></View>
										<View style={styles.metric}><Ionicons name="shield-checkmark-outline" size={17} color={t.accent} /><Text style={styles.metricLabel}>encrypted</Text></View>
										<View style={styles.metric}><Ionicons name="flash-outline" size={17} color={t.primary} /><Text style={styles.metricLabel}>live sync</Text></View>
									</View>
								</View>
								<View style={[styles.workspaceGrid, !wide && styles.workspaceGridStack]}>
								<ThemedView style={[styles.container, styles.composerCard]}>
									<View style={styles.headerWithButton}>
										<View><Text style={styles.cardEyebrow}>NEW CLIP</Text><ThemedText style={styles.cardTitle}>Capture a thought</ThemedText></View>
										<View style={styles.buttonContainer}>
											<TouchableOpacity accessibilityRole="button" accessibilityLabel="Paste from clipboard" style={styles.iconAction} onPress={handlePaste}>
												<Ionicons name="clipboard-outline" size={19} color={t.primary} /><Text style={styles.iconActionText}>Paste</Text>
											</TouchableOpacity>
										</View>
									</View>
									<View style={styles.composerBody}>
										<TextInput style={styles.composerInput} placeholder="Paste a link, command, note, or little spark…" placeholderTextColor={t.placeholder} value={saveTextData} onChangeText={setSaveTextData} multiline editable selectionColor={t.primary} />
										<View style={styles.composerFooter}><Text style={styles.characterCount}>{saveTextData.length} characters</Text><TouchableOpacity accessibilityLabel="Save text" disabled={!saveTextData.trim()} style={[styles.saveButton, { opacity: saveTextData.trim() ? 1 : 0.42 }]} onPress={() => handleSave(saveTextData)}><Ionicons name="arrow-up" size={19} color={t.onPrimary} /><Text style={styles.saveButtonText}>Save clip</Text></TouchableOpacity></View>
									</View>
								</ThemedView>
								<ThemedView style={[styles.container, styles.latestCard]}>
									<View style={styles.headerWithButton}>
										<View><Text style={styles.cardEyebrow}>MOST RECENT</Text><ThemedText style={styles.cardTitle}>Latest clip</ThemedText></View>
										<View style={styles.buttonContainer}>
											<TouchableOpacity style={styles.roundAction} accessibilityLabel="Copy latest clip" disabled={!latestText} onPress={() => handleCopy(latestText || '')}><Ionicons name="copy-outline" size={19} color={t.primary} /></TouchableOpacity>
										</View>
									</View>
									<View style={styles.latestBody}><View style={styles.quoteMark}><Ionicons name="sparkles" size={18} color={t.primary} /></View><ScrollView nestedScrollEnabled><Text style={[styles.latestText, !latestText && styles.latestPlaceholder]}>{latestText || 'Your newest clip will glow here the moment you save it.'}</Text></ScrollView></View>
									<View style={styles.latestFooter}><View style={styles.securityTag}><Ionicons name="lock-closed" size={12} color={t.accent} /><Text style={styles.securityText}>Private & encrypted</Text></View><Text style={styles.characterCount}>{latestText?.length ?? 0} chars</Text></View>
								</ThemedView>
								</View>
								<ThemedView style={[styles.container, styles.libraryCard]}>
									<View style={styles.headerWithButton}>
										<View><Text style={styles.cardEyebrow}>HISTORY</Text><ThemedText style={styles.cardTitle}>Your clip library</ThemedText></View>
										<TouchableOpacity style={styles.iconAction} onPress={() => setConfirmationVisible(true)} disabled={!clipboardEntries.length}>
											<Ionicons name="trash-outline" size={17} color={t.textMuted} /><Text style={styles.iconActionText}>Clear all</Text>
										</TouchableOpacity>
									</View>
									<ClipboardScreen clipboardEntries={clipboardEntries} showAlert={showAlert} onDelete={remove} />
								</ThemedView>
							</View>
							</Reveal>
						)}
					</ThemedView>
				</SafeAreaView>
			</ScrollView>
		</>
	);
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
	catBody: {
        backgroundColor: t.surfaceAlt,
		height: 200,
		borderWidth: 1,
		borderColor: t.border,
		borderRadius: 16,
		overflow: 'hidden'
	},
	catBodyText: {
		padding: 10,
		fontSize: 16,
		color: t.text,
	},
	safeArea: {
		flex: 1,
		backgroundColor: t.background,
		paddingTop: Platform.OS === 'web' ? 0 : 30,
		position: 'relative',
	},
	text: {
		color: t.text
	},
	centerContainer: {
		backgroundColor: 'transparent',
		padding: Platform.OS === 'web' ? 18 : 10,
		paddingTop: 2,
		borderRadius: 16,
	},
	workspace: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingTop: 42, paddingBottom: 90 },
	workspaceHero: { paddingHorizontal: 6, marginBottom: 30 },
	eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
	liveDot: { width: 7, height: 7, borderRadius: 8, backgroundColor: t.accent, shadowColor: t.accent, shadowOpacity: 0.5, shadowRadius: 7 },
	eyebrow: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
	workspaceTitle: { color: t.text, fontSize: 42, lineHeight: 48, fontWeight: '800', letterSpacing: -1.8 },
	workspaceSubtitle: { color: t.textMuted, fontSize: 16, lineHeight: 25, marginTop: 7 },
	metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 20 },
	metric: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: t.glass, borderWidth: 1, borderColor: t.borderSubtle },
	metricValue: { color: t.text, fontSize: 13, fontWeight: '800' },
	metricLabel: { color: t.textMuted, fontSize: 11, fontWeight: '600' },
	workspaceGrid: { flexDirection: 'row', gap: 18, alignItems: 'stretch' },
	workspaceGridStack: { flexDirection: 'column' },
	catContainer: {
		backgroundColor: t.surface,
        marginTop: 18,
		paddingTop: 2,
		borderRadius: 16,
	},
	container: {
		borderWidth: 1, borderColor: t.borderSubtle,
		backgroundColor: t.glass,
		padding: 24,
		borderRadius: 24,
		overflow: 'hidden'
	},
	composerCard: { flex: 1.15, minHeight: 330, shadowColor: t.shadow, shadowOpacity: 0.07, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 5 },
	latestCard: { flex: 0.85, minHeight: 330, backgroundColor: t.surfaceAlt },
	libraryCard: { width: '100%', marginTop: 18 },
	cardEyebrow: { color: t.primary, fontSize: 9, lineHeight: 14, fontWeight: '800', letterSpacing: 1.8, marginBottom: 3 },
	cardTitle: { color: t.text, fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.6 },
	composerBody: { flex: 1, marginTop: 20, borderRadius: 18, backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle, padding: 16 },
	composerInput: { flex: 1, minHeight: 165, color: t.text, fontSize: 16, lineHeight: 24, textAlignVertical: 'top', outlineStyle: 'none' } as any,
	composerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: t.borderSubtle },
	characterCount: { color: t.textMuted, fontSize: 10, fontWeight: '600' },
	saveButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 13, backgroundColor: t.primaryStrong, shadowColor: t.primaryStrong, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
	saveButtonText: { color: t.onPrimary, fontSize: 12, fontWeight: '800' },
	iconAction: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.primarySoft, borderWidth: 1, borderColor: t.borderSubtle },
	iconActionText: { color: t.text, fontSize: 11, fontWeight: '700' },
	roundAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: t.surface, borderWidth: 1, borderColor: t.borderSubtle },
	latestBody: { flex: 1, minHeight: 180, marginTop: 22, flexDirection: 'row', gap: 12 },
	quoteMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: t.primarySoft },
	latestText: { flex: 1, color: t.text, fontSize: 17, lineHeight: 28, letterSpacing: -0.2 },
	latestPlaceholder: { color: t.textMuted },
	latestFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: t.borderSubtle },
	securityTag: { flexDirection: 'row', alignItems: 'center', gap: 6 }, securityText: { color: t.textMuted, fontSize: 10, fontWeight: '600' },
	buttonContainer: {
		flexDirection: 'row',
		marginLeft: 10,
	},
	headerWithButton: {
        flexWrap: 'wrap', gap: 10,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		borderRadius: 12,
	},
	copyButtonText: {
		marginLeft: 5,
		fontWeight: '500',
	},
});
