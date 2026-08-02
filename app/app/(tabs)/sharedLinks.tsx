import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity, SafeAreaView, TextInput, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Header from '@/components/Header';
import { router, useNavigation } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { truncateContent } from '@/service/util';
import { Shared } from '@/service/models';
import { apiService } from '@/service/apiService';
import { getMasterKey } from '@/service/keyService';
import { isEnvelope, normalizeShareToken, formatShareToken } from '@/service/cryptoService';
import { createShare, tokenFromShared, decryptSharedContent, getSharedLinkURL } from '@/service/shareService';
import NoItemsComponent from '@/components/NoItems';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import * as Clipboard from 'expo-clipboard';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

// A shared link decorated with its decrypted preview and recovered token.
interface DecoratedShared {
	shared: Shared;
	preview: string;
	token: string | null;
}

const sharedId = (item: Shared): string => item._id || item.id || '';

export default function SharedLinks() {
	const navigation = useNavigation();
	const t = useTheme();
	const styles = useThemedStyles(makeStyles);
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

	const { user, encryptionReady } = useAuth();

	const showAlert = (message: string) => {
		setAlertMessage(message);
		setAlertVisible(true);
		setTimeout(() => setAlertVisible(false), 3000);
	};

	const decorate = async (items: Shared[]): Promise<DecoratedShared[]> => {
		const mk = await getMasterKey();
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
		if (!user || !encryptionReady) return;
		try {
			const links = await apiService.getSharedLinks();
			setSharedLinks(await decorate(links));
		} catch {
			showAlert('Could not load shared links');
		}
	}, [user, encryptionReady]);

	useEffect(() => {
		fetchSharedLinks();
	}, [fetchSharedLinks]);

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
		const content = textToShare.trim();
		if (!content) {
			showAlert('Please enter text to share.');
			return;
		}
		const mk = await getMasterKey();
		if (!mk) {
			showAlert('Log in and unlock your data to share text.');
			return;
		}
		try {
			const result = await createShare(content, mk);
			setSharedLink(result.url);
			setSharedCode(result.displayCode);
			setShareDialogVisible(true);
			setTextToShare('');
			setSharedLinks(prev => [{ shared: result.shared, preview: content, token: result.token }, ...prev]);
		} catch {
			showAlert('Failed to create shared link.');
		}
	};

	// Re-share an existing link: rebuild link/code from the stored token.
	const handleShareExisting = (item: DecoratedShared) => {
		if (!item.token) {
			showAlert('This link was created before encryption and can no longer be re-shared.');
			return;
		}
		setSharedLink(getSharedLinkURL(item.token));
		setSharedCode(formatShareToken(item.token));
		setShareDialogVisible(true);
	};

	const handleRetrieve = () => {
		const token = normalizeShareToken(retrieveText);
		if (!token) {
			showAlert('Please enter a code to retrieve your text.');
			return;
		}
		router.push(`/shared/${token}`);
		setRetrieveText('');
	};

	const handleCopyLink = async () => {
		if (sharedLink) {
			await Clipboard.setStringAsync(sharedLink);
			setShareDialogVisible(false);
			showAlert('Link copied to clipboard.');
		}
	};

	const handleCopyCode = async () => {
		if (sharedCode) {
			await Clipboard.setStringAsync(sharedCode);
			setShareDialogVisible(false);
			showAlert('Code copied to clipboard.');
		}
	};

	const handleRemove = async () => {
		try {
			await apiService.deleteSharedLink(itemToRemoveId);
			setSharedLinks(prev => prev.filter(item => sharedId(item.shared) !== itemToRemoveId));
			setConfirmationVisible(false);
			showAlert('Shared link deleted successfully.');
		} catch {
			showAlert('Failed to delete shared link.');
		}
	};

	const handleDeleteAll = async () => {
		try {
			await apiService.deleteAllSharedLinks();
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
				buttons={[
					{ label: 'No', onPress: () => setConfirmationVisible(false) },
					{ label: 'Yes', onPress: handleRemove },
				]}
			/>
			<Confirmation
				message={`Share this link or code — it expires in 7 days.\n`}
				subtitle={`Link: ${sharedLink || ''}\nCode: ${sharedCode || ''}`}
				visible={shareDialogVisible}
				buttons={[
					{ label: 'Copy Link', onPress: handleCopyLink },
					{ label: 'Copy Code', onPress: handleCopyCode },
					{ label: 'Close', onPress: () => setShareDialogVisible(false), variant: 'danger' },
				]}
			/>
			<Confirmation
				message="Are you sure you want to delete all shared links?"
				subtitle=''
				visible={deleteAllConfirmationVisible}
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
					<Header navigation={navigation} />
					<ThemedView style={styles.containerLight}>
						<ThemedText type="defaultSemiBold" style={styles.heading}>
							Paste your text here and click on Share to easily share text with friends!
						</ThemedText>
						<ThemedView style={styles.inputContainer}>
							<TextInput
								style={styles.inputLight}
								placeholder="Enter text to share"
								placeholderTextColor={t.placeholder}
								value={textToShare}
								onChangeText={setTextToShare}
							/>
							<TouchableOpacity style={styles.tertiaryButton} onPress={handleShare}>
								<Ionicons name="share-social-outline" size={24} color={t.icon} />
								<ThemedText type="default" style={styles.tertiaryButtonText}>
									Share
								</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
					<ThemedView style={[styles.containerLight]}>
						<ThemedText type="defaultSemiBold" style={styles.heading}>Retrieve Text:</ThemedText>
						<ThemedView style={styles.inputContainer}>
							<TextInput
								style={styles.inputLight2}
								placeholder="Enter the code here to retrieve your text"
								placeholderTextColor={t.placeholder}
								value={retrieveText}
								onChangeText={setRetrieveText}
							/>
							<TouchableOpacity style={styles.tertiaryButton} onPress={handleRetrieve}>
								<Ionicons name="share-outline" size={24} color={t.icon} />
								<ThemedText type="default" style={styles.tertiaryButtonText}>Retrieve</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
					{user && (
						<ThemedView style={styles.containerLight}>
							<ThemedView style={styles.headingContainer}>
								<ThemedText type="defaultSemiBold">
									Recent Shared Links:
								</ThemedText>
								<TouchableOpacity onPress={() => setDeleteAllConfirmationVisible(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Ionicons name="trash-outline" size={24} color={t.icon} />
									{Platform.OS === 'web' && (
										<Text style={{ color: t.text, marginLeft: 5 }}>
											Delete all Entries
										</Text>
									)}
								</TouchableOpacity>
							</ThemedView>
							<View style={styles.flatListContainer}>
								<ScrollView
									scrollEnabled={true}
									nestedScrollEnabled={true}>
									{sharedLinks.length > 0 ? (
										<FlatList
											data={sharedLinks}
											keyExtractor={(item) => sharedId(item.shared)}
											renderItem={({ item }) => (
												<TouchableOpacity onPress={() => item.token && router.push(`/shared/${item.token}`)}>
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
															<TouchableOpacity style={styles.button} onPress={() => { setItemToRemoveId(sharedId(item.shared)); setConfirmationVisible(true); }}>
																<Ionicons name="trash-outline" size={24} color={t.icon} />
															</TouchableOpacity>
															<TouchableOpacity style={styles.button} onPress={() => handleShareExisting(item)}>
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
								</ScrollView>
							</View>
						</ThemedView>
					)}
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
	},
	flatListContainer: {
		height: 300,
		paddingRight: 5,
		marginBottom: 10,
	},
	containerLight: {
		backgroundColor: t.background,
		padding: 16,
		marginLeft: Platform.OS === 'web' ? 10 : 0,
		marginRight: Platform.OS === 'web' ? 10 : 0,
	},
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
		borderRadius: 8,
		backgroundColor: t.surfaceAlt,
		shadowColor: t.shadow,
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 2,
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
	},
	inputLight2: {
		height: 40,
		borderColor: t.border,
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: t.background,
		color: t.text,
		marginBottom: 16,
		width: '100%',
		alignSelf: 'center'
	},
	tertiaryButtonText: {
		color: t.text,
		fontSize: 16,
		marginLeft: 8,
		fontWeight: 'bold',
		textDecorationColor: t.text,
		textDecorationStyle: 'solid',
		textDecorationLine: 'underline'
	},
	headingContainer: {
		marginBottom: Platform.OS === 'web' ? 25 : 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: t.background,
	},
	inputContainer: {
		flexDirection: Platform.OS === 'web' ? 'row' : 'column',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: Platform.OS === 'web' ? 20 : 0,
		backgroundColor: t.background
	},
	inputLight: {
		flex: 1,
		height: 40,
		borderColor: t.border,
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: t.background,
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
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: t.background,
	},
});
