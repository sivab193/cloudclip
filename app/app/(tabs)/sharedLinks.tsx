import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity, SafeAreaView, TextInput, Platform, ScrollView, useWindowDimensions, Modal, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Header from '@/components/Header';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { truncateContent } from '@/service/util';
import { Shared } from '@/service/models';
import { apiService } from '@/service/apiService';
import { getMasterKey } from '@/service/keyService';
import { isEnvelope, shareCodeFromToken } from '@/service/cryptoService';
import { ACCOUNT_SHARE_EXPIRY_OPTIONS, createShare, tokenFromShared, decryptSharedContent, expiryLabel, getSharedLinkURL, isShareCode, shareCredentialFromInput } from '@/service/shareService';
import NoItemsComponent from '@/components/NoItems';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import * as Clipboard from 'expo-clipboard';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import useAccountGuard from '@/hooks/useAccountGuard';
import AmbientBackdrop from '@/components/AmbientBackdrop';
import Reveal from '@/components/Reveal';

// A shared link decorated with its decrypted preview and recovered token.
interface DecoratedShared {
	shared: Shared;
	preview: string;
	token: string | null;
}

const sharedId = (item: Shared): string => item._id || item.id || '';

export default function SharedLinks() {
	const t = useTheme();
	const styles = useThemedStyles(makeStyles);
	const { width } = useWindowDimensions();
	const wide = width >= 820;
	const compact = width < 600;
	const [textToShare, setTextToShare] = useState('');
	const [retrieveText, setRetrieveText] = useState('');
	const [sharedLinks, setSharedLinks] = useState<DecoratedShared[]>([]);
	const [confirmationVisible, setConfirmationVisible] = useState(false);
	const [itemToRemoveId, setItemToRemoveId] = useState('');
	const [alertVisible, setAlertVisible] = useState(false);
	const [alertMessage, setAlertMessage] = useState('');
	const [shareDialogVisible, setShareDialogVisible] = useState(false);
	const [sharedLink, setSharedLink] = useState<string | null>(null);
	const [sharedCode, setSharedCode] = useState<string | null>(null);
	const [deleteAllConfirmationVisible, setDeleteAllConfirmationVisible] = useState(false);
	const [ttlMinutes, setTtlMinutes] = useState(24 * 60);
	const [expiryItemId, setExpiryItemId] = useState('');
	const [updatingExpiry, setUpdatingExpiry] = useState(false);

	const { user, encryptionReady } = useAuth();
	const { capture } = useAccountGuard();
	const revision = useRef(0);
	const sharing = useRef<(() => boolean) | null>(null);
	const alertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => () => { if (alertTimer.current) clearTimeout(alertTimer.current); }, []);

	const showAlert = (message: string) => {
		setAlertMessage(message);
		setAlertVisible(true);
		if (alertTimer.current) clearTimeout(alertTimer.current);
		alertTimer.current = setTimeout(() => setAlertVisible(false), 3000);
	};

	const decorate = async (items: Shared[]): Promise<DecoratedShared[]> => {
		const mk = await getMasterKey(true);
		return items.map((shared) => {
			const token = mk ? tokenFromShared(shared, mk) : null;
			let preview = '[Encrypted]';
			if (token) {
				try {
					preview = decryptSharedContent(token, shared.content);
				} catch {
					preview = '[Unable to decrypt]';
				}
			} else if (!isEnvelope(shared.content)) {
				preview = shared.content; // pre-encryption legacy link
			}
			return { shared, preview, token };
		});
	};

	const fetchSharedLinks = useCallback(async () => {
		const valid = capture();
		if (!valid()) return;
		const started = revision.current;
		try {
			const links = await apiService.getSharedLinks();
			if (!valid()) return;
			const decorated = await decorate(links);
			if (valid() && started === revision.current) setSharedLinks(decorated);
		} catch {
			if (valid()) showAlert('Could not load shared links');
		}
	}, [capture]);

	useFocusEffect(useCallback(() => { void fetchSharedLinks(); }, [fetchSharedLinks]));
	useEffect(() => {
		revision.current++;
		setSharedLinks([]);
		setTextToShare('');
		setSharedLink(null);
		setSharedCode(null);
		setShareDialogVisible(false);
		setConfirmationVisible(false);
		setDeleteAllConfirmationVisible(false);
		setExpiryItemId('');
	}, [user?.uid, encryptionReady]);

	const calculateTimeLeft = (expiryAt: string | null): string => {
		if (!expiryAt) return '';
		const timeLeft = new Date(expiryAt).getTime() - Date.now();
		if (timeLeft <= 0) return 'Expired';
		const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
		const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
		const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
		return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
	};

	// Creates the shared link ONCE, then the dialog buttons only copy.
	const handleShare = async () => {
		const valid = capture();
		const content = textToShare;
		if (!content.trim()) {
			showAlert('Please enter text to share.');
			return;
		}
		if (sharing.current?.()) return;
		sharing.current = valid;
		try {
			const mk = await getMasterKey(true);
			if (!mk || !valid()) throw new Error('Log in and unlock your data to share text.');
			const result = await createShare(content, mk, ttlMinutes);
			if (!valid()) return;
			revision.current++;
			setSharedLink(result.url);
			setSharedCode(result.displayCode);
			setShareDialogVisible(true);
			setTextToShare('');
			setSharedLinks(prev => [{ shared: result.shared, preview: content, token: result.token }, ...prev]);
		} catch (error) {
			if (valid()) showAlert(error instanceof Error ? error.message : 'Failed to create shared link.');
		} finally { if (sharing.current === valid) sharing.current = null; }
	};

	const handleUpdateExpiry = async (minutes: number) => {
		const valid = capture();
		if (!valid() || !expiryItemId || updatingExpiry) return;
		setUpdatingExpiry(true);
		try {
			const updated = await apiService.updateSharedLinkExpiry(expiryItemId, minutes);
			if (!valid()) return;
			setSharedLinks(items => items.map(item => sharedId(item.shared) === expiryItemId
				? { ...item, shared: { ...item.shared, expiryAt: updated.expiryAt } }
				: item));
			setExpiryItemId('');
			showAlert(`Expiry changed to ${expiryLabel(minutes)} from now.`);
		} catch (error) {
			showAlert(error instanceof Error ? error.message : 'Could not update expiry.');
		} finally {
			setUpdatingExpiry(false);
		}
	};

	// Re-share an existing link: rebuild link/code from the stored token.
	const handleShareExisting = (item: DecoratedShared) => {
		if (!item.token) {
			showAlert('This link was created before encryption and can no longer be re-shared.');
			return;
		}
		setSharedLink(getSharedLinkURL(item.token));
		setSharedCode(shareCodeFromToken(item.token));
		setShareDialogVisible(true);
	};

	const handleRetrieve = () => {
		const credential = shareCredentialFromInput(retrieveText);
		if (!credential) {
			showAlert('Enter a four-character code or paste a CloudClip link.');
			return;
		}
		router.push(isShareCode(credential) ? `/s/${credential}` : `/shared#${credential}`);
		setRetrieveText('');
	};

	const handleCopyLink = async () => {
		if (sharedLink) {
			try {
				await Clipboard.setStringAsync(sharedLink);
				setShareDialogVisible(false);
				showAlert('Link copied to clipboard.');
			} catch { showAlert('Could not copy to clipboard.'); }
		}
	};

	const handleCopyCode = async () => {
		if (sharedCode) {
			try {
				await Clipboard.setStringAsync(sharedCode);
				setShareDialogVisible(false);
				showAlert('Share code copied to clipboard.');
			} catch { showAlert('Could not copy to clipboard.'); }
		}
	};

	const handleRemove = async () => {
		const valid = capture();
		if (!valid()) return;
		try {
			await apiService.deleteSharedLink(itemToRemoveId);
			if (!valid()) return;
			revision.current++;
			setSharedLinks(prev => prev.filter(item => sharedId(item.shared) !== itemToRemoveId));
			setConfirmationVisible(false);
			showAlert('Shared link deleted successfully.');
		} catch {
			showAlert('Failed to delete shared link.');
		}
	};

	const handleDeleteAll = async () => {
		const valid = capture();
		if (!valid()) return;
		try {
			await apiService.deleteAllSharedLinks();
			if (!valid()) return;
			revision.current++;
			setSharedLinks([]);
			setDeleteAllConfirmationVisible(false);
			showAlert('All shared links have been deleted.');
		} catch {
			setDeleteAllConfirmationVisible(false);
			showAlert('An error occurred while deleting shared links.');
		}
	};

	return (
		<>
			<Alert message={alertMessage} visible={alertVisible} />
			<Confirmation
				message="Are you sure you want to proceed?"
				subtitle=''
				visible={confirmationVisible}
				onDismiss={() => setConfirmationVisible(false)}
				buttons={[
					{ label: 'No', onPress: () => setConfirmationVisible(false) },
					{ label: 'Yes', onPress: handleRemove },
				]}
			/>
			<Confirmation
				message={`Share this encrypted link — it expires in ${expiryLabel(ttlMinutes)}.\n`}
				subtitle={`Link: ${sharedLink || ''}\nCode: ${sharedCode || ''}`}
				visible={shareDialogVisible}
				onDismiss={() => setShareDialogVisible(false)}
				buttons={[
					{ label: 'Copy Link', onPress: handleCopyLink },
					{ label: 'Copy Code', onPress: handleCopyCode },
					{ label: 'Close', onPress: () => setShareDialogVisible(false), variant: 'danger' },
				]}
			/>
			<Modal transparent visible={Boolean(expiryItemId)} animationType="fade" onRequestClose={() => !updatingExpiry && setExpiryItemId('')}>
				<View style={styles.expiryOverlay}>
					<View style={styles.expiryModal}>
						<View style={styles.cardIcon}><Ionicons name="timer-outline" size={22} color={t.primary} /></View>
						<Text style={styles.expiryTitle}>Change link expiry</Text>
						<Text style={styles.expirySubtitle}>Choose how long the link should remain active from now.</Text>
						<View style={styles.expiryOptions}>{ACCOUNT_SHARE_EXPIRY_OPTIONS.map(option => (
							<TouchableOpacity key={option.minutes} disabled={updatingExpiry} onPress={() => void handleUpdateExpiry(option.minutes)} style={styles.expiryOption}>
								<Text style={styles.expiryOptionText}>{option.label}</Text>
							</TouchableOpacity>
						))}</View>
						{updatingExpiry ? <ActivityIndicator color={t.primary} style={styles.expiryProgress} /> : null}
						<TouchableOpacity disabled={updatingExpiry} onPress={() => setExpiryItemId('')} style={styles.expiryCancel}><Text style={styles.expiryCancelText}>Cancel</Text></TouchableOpacity>
					</View>
				</View>
			</Modal>
			<Confirmation
				message="Are you sure you want to delete all shared links?"
				subtitle=''
				visible={deleteAllConfirmationVisible}
				onDismiss={() => setDeleteAllConfirmationVisible(false)}
				buttons={[
					{ label: 'Cancel', onPress: () => setDeleteAllConfirmationVisible(false) },
					{ label: 'Delete All', onPress: handleDeleteAll, variant: 'danger' },
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
					<Reveal>
					<View style={[styles.page, compact && styles.pageCompact]}>
						<View style={styles.hero}>
							<View style={styles.eyebrowRow}><View style={styles.liveDot} /><Text style={styles.eyebrow}>SECURE SHARING</Text></View>
							<ThemedText style={[styles.heroTitle, compact && styles.heroTitleCompact]}>Send a thought.{ '\n' }Let it disappear.</ThemedText>
							<ThemedText style={styles.heroSubtitle}>Create client-encrypted links that expire automatically, or open a clip with its short code.</ThemedText>
						</View>
						<View style={[styles.actionGrid, !wide && styles.actionGridStack]}>
					<ThemedView style={[styles.containerLight, compact && styles.containerCompact]}>
						<View style={styles.cardIcon}><Ionicons name="paper-plane-outline" size={22} color={t.primary} /></View>
						<ThemedText type="defaultSemiBold" style={styles.heading}>Create an expiring link</ThemedText>
						<Text style={styles.cardHint}>Encrypted in your browser. Choose when it disappears.</Text>
						<View accessibilityRole="radiogroup" style={styles.createExpiryOptions}>{ACCOUNT_SHARE_EXPIRY_OPTIONS.map(option => (
							<TouchableOpacity key={option.minutes} accessibilityRole="radio" accessibilityState={{ checked: ttlMinutes === option.minutes }} onPress={() => setTtlMinutes(option.minutes)} style={[styles.createExpiryOption, ttlMinutes === option.minutes && styles.createExpiryOptionActive]}>
								<Text style={[styles.createExpiryText, ttlMinutes === option.minutes && styles.createExpiryTextActive]}>{option.label}</Text>
							</TouchableOpacity>
						))}</View>
						<ThemedView style={[styles.inputContainer, !wide && styles.inputContainerStack]}>
							<TextInput
								accessibilityLabel="Text to share"
								style={[styles.inputLight, !wide && styles.inputCompact, compact && styles.shareInputCompact]}
								placeholder="Enter text to share"
								placeholderTextColor={t.placeholder}
								multiline={compact}
								textAlignVertical="top"
								value={textToShare}
								onChangeText={setTextToShare}
							/>
							<TouchableOpacity accessibilityRole="button" style={[styles.tertiaryButton, compact && styles.tertiaryButtonCompact, !textToShare.trim() && styles.buttonDisabled]} onPress={handleShare} disabled={!textToShare.trim()}>
								<Ionicons name="share-social-outline" size={22} color={textToShare.trim() ? t.onPrimary : t.textDisabled} />
								<ThemedText type="default" style={[styles.tertiaryButtonText, !textToShare.trim() && styles.buttonTextDisabled]}>
									Create link
								</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
					<ThemedView style={[styles.containerLight, compact && styles.containerCompact]}>
						<View style={styles.cardIcon}><Ionicons name="key-outline" size={22} color={t.primary} /></View>
						<ThemedText type="defaultSemiBold" style={styles.heading}>Open a shared link</ThemedText>
						<Text style={styles.cardHint}>Enter the four-character code, or paste a CloudClip link.</Text>
						<ThemedView style={[styles.inputContainer, !wide && styles.inputContainerStack]}>
							<TextInput
								accessibilityLabel="Shared code or link"
								autoCapitalize="none"
								autoCorrect={false}
								style={[styles.inputLight2, !wide && styles.inputCompact]}
								placeholder="A7K2 or a CloudClip link"
								placeholderTextColor={t.placeholder}
								value={retrieveText}
								onChangeText={setRetrieveText}
							/>
							<TouchableOpacity accessibilityRole="button" style={[styles.tertiaryButton, compact && styles.tertiaryButtonCompact, !retrieveText.trim() && styles.buttonDisabled]} onPress={handleRetrieve} disabled={!retrieveText.trim()}>
								<Ionicons name="share-outline" size={22} color={retrieveText.trim() ? t.onPrimary : t.textDisabled} />
								<ThemedText type="default" style={[styles.tertiaryButtonText, !retrieveText.trim() && styles.buttonTextDisabled]}>Retrieve</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
						</View>
					{user && (
						<ThemedView style={[styles.containerLight, compact && styles.containerCompact]}>
							<ThemedView style={styles.headingContainer}>
								<ThemedText type="defaultSemiBold">
									Your active links
								</ThemedText>
								<TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear all active links" onPress={() => setDeleteAllConfirmationVisible(true)} disabled={!sharedLinks.length} style={styles.clearButton}>
									<Ionicons name="trash-outline" size={24} color={t.icon} />
									{Platform.OS === 'web' && (
										<Text style={[styles.clearText, !sharedLinks.length && styles.clearTextDisabled]}>
											Clear all
										</Text>
									)}
								</TouchableOpacity>
							</ThemedView>
							<View style={styles.flatListContainer}>
									{sharedLinks.length > 0 ? (
										<FlatList
											data={sharedLinks}
											nestedScrollEnabled
											keyExtractor={(item) => sharedId(item.shared)}
											renderItem={({ item }) => (
											<TouchableOpacity onPress={() => router.push(`/s/${item.shared.code}`)}>
													<View style={styles.itemContainerLight}>
														<View style={styles.textContainer}>
															<Text style={styles.itemTitle}>
																{truncateContent(item.preview)}
															</Text>
															<Text style={styles.itemExpiry}>
																Expires in: {calculateTimeLeft(item.shared.expiryAt || null)}
															</Text>
														</View>
														<View style={styles.buttonContainer}>
														<TouchableOpacity accessibilityLabel="Change link expiry" style={styles.button} onPress={(event) => { event.stopPropagation(); setExpiryItemId(sharedId(item.shared)); }}>
															<Ionicons name="timer-outline" size={24} color={t.icon} />
														</TouchableOpacity>
														<TouchableOpacity style={styles.button} onPress={(event) => { event.stopPropagation(); setItemToRemoveId(sharedId(item.shared)); setConfirmationVisible(true); }}>
																<Ionicons name="trash-outline" size={24} color={t.icon} />
															</TouchableOpacity>
														<TouchableOpacity style={styles.button} onPress={(event) => { event.stopPropagation(); handleShareExisting(item); }}>
																<Ionicons name="share-social-outline" size={24} color={t.icon} />
															</TouchableOpacity>
														</View>
													</View>
												</TouchableOpacity>
											)}
											contentContainerStyle={styles.listContent}
										/>
									) : (
										<NoItemsComponent />
									)}
							</View>
						</ThemedView>
					)}
					</View>
					</Reveal>
				</SafeAreaView>
			</ScrollView >
		</>
	);
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: t.background,
		paddingTop: Platform.OS === 'web' ? 0 : 30,
		position: 'relative',
	},
	page: { width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 48, paddingBottom: 100 },
	pageCompact: { paddingTop: 28, paddingBottom: 36 },
	hero: { paddingHorizontal: 4, marginBottom: 30 },
	eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 13 },
	liveDot: { width: 7, height: 7, borderRadius: 7, backgroundColor: t.accent },
	eyebrow: { color: t.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
	heroTitle: { color: t.text, fontSize: 44, lineHeight: 49, fontWeight: '800', letterSpacing: -2 },
	heroTitleCompact: { fontSize: 34, lineHeight: 39, letterSpacing: -1.1 },
	heroSubtitle: { color: t.textMuted, fontSize: 15, lineHeight: 24, maxWidth: 580, marginTop: 12 },
	actionGrid: { flexDirection: 'row', gap: 18, alignItems: 'stretch' },
	actionGridStack: { flexDirection: 'column' },
	flatListContainer: { minHeight: 200, maxHeight: 400, marginBottom: 10 },
	containerLight: {
		flex: 1,
		width: '100%',
		backgroundColor: t.glass,
		padding: 24,
		marginBottom: 18,
		borderWidth: 1,
		borderColor: t.borderSubtle,
		borderRadius: 24,
		shadowColor: t.shadow,
		shadowOpacity: 0.065,
		shadowRadius: 28,
		shadowOffset: { width: 0, height: 12 },
	},
	containerCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', padding: 18, marginBottom: 0, borderRadius: 16, shadowOpacity: 0 },
	cardIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: t.primarySoft, marginBottom: 18 },
	cardHint: { color: t.textMuted, fontSize: 12, lineHeight: 19, marginTop: -5, marginBottom: 20 },
	createExpiryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: -7, marginBottom: 18 },
	createExpiryOption: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt },
	createExpiryOptionActive: { borderColor: t.primary, backgroundColor: t.primarySoft },
	createExpiryText: { color: t.textMuted, fontSize: 11, fontWeight: '700' },
	createExpiryTextActive: { color: t.primary },
	listContent: {
		paddingBottom: 16,
	},
	itemContainerLight: {
		cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		marginBottom: 16,
		borderRadius: 16,
		backgroundColor: t.surfaceAlt,
		shadowColor: t.shadow,
		shadowOpacity: 0.04,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 16,
		elevation: 2,
	},
	textContainer: {
		flex: 2,
		marginRight: 16,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		alignItems: 'center',
		flex: 1,
	},
	button: {
		marginLeft: 10
	},
	itemTitle: {
		fontSize: 16,
		color: t.text,
	},
	itemExpiry: {
		fontSize: 14,
		color: t.textMuted,
	},
	heading: {
		marginBottom: 10,
		color: t.text,
		fontSize: 20,
		lineHeight: 27,
		fontWeight: '700',
		letterSpacing: -0.6,
	},
	inputLight2: {
		height: 54,
		borderColor: t.border,
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 8,
		backgroundColor: t.surfaceAlt,
		color: t.text,
		marginBottom: 16,
		width: '100%',
		alignSelf: 'center'
	},
	tertiaryButtonText: {
		color: t.onPrimary,
		fontSize: 13,
		marginLeft: 8,
		fontWeight: 'bold',
	},
	headingContainer: {
		marginBottom: Platform.OS === 'web' ? 25 : 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: 'transparent',
	},
	inputContainer: {
		flexDirection: Platform.OS === 'web' ? 'row' : 'column',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: Platform.OS === 'web' ? 20 : 0,
		backgroundColor: 'transparent'
	},
	inputContainerStack: { flexDirection: 'column', alignItems: 'stretch' },
	inputCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', marginRight: 0, paddingHorizontal: 14, fontSize: 16 },
	shareInputCompact: { minHeight: 132, paddingTop: 14 },
	inputLight: {
		flex: 1,
		height: 54,
		borderColor: t.border,
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 8,
		backgroundColor: t.surfaceAlt,
		color: t.text,
		marginBottom: 16,
		marginRight: 10,
		width: '100%'
	},
	tertiaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: 'auto',
		minHeight: 50,
		paddingVertical: 12,
		paddingHorizontal: 18,
		borderRadius: 14,
		backgroundColor: t.primaryStrong,
		shadowColor: t.primaryStrong,
		shadowOpacity: 0.24,
		shadowRadius: 14,
	},
	tertiaryButtonCompact: { width: '100%', borderRadius: 9, shadowOpacity: 0 },
	buttonDisabled: { backgroundColor: t.surfaceDisabled },
	buttonTextDisabled: { color: t.textDisabled },
	clearButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
	clearText: { color: t.text, marginLeft: 5, fontSize: 14 },
	clearTextDisabled: { color: t.textDisabled },
	expiryOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: t.overlay },
	expiryModal: { width: '100%', maxWidth: 440, padding: 26, borderRadius: 24, borderWidth: 1, borderColor: t.border, backgroundColor: t.glass, shadowColor: t.shadow, shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: 15 } },
	expiryTitle: { color: t.text, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.5 },
	expirySubtitle: { color: t.textMuted, fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 20 },
	expiryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
	expiryOption: { width: '48%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surfaceAlt },
	expiryOptionText: { color: t.text, fontSize: 13, fontWeight: '700' },
	expiryProgress: { marginTop: 16 },
	expiryCancel: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 18, borderRadius: 12, backgroundColor: t.surfaceDisabled },
	expiryCancelText: { color: t.textMuted, fontSize: 13, fontWeight: '700' },
});
