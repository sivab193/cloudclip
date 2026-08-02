import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Platform, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Header from '../../components/Header';
import Description from '@/components/Description';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import ClipboardScreen from '@/components/Clipboard';
import { getClipboard, setClipboard } from '@/service/clipboardService';
import { apiService } from '@/service/apiService';
import { socketService } from '@/service/socketService';
import { CustomClipboard } from '@/service/models';
import { getMasterKey } from '@/service/keyService';
import { decryptEntry, encryptEntry, isEnvelope, hashText } from '@/service/cryptoService';
import { decide, getSyncState, setSyncState, getAutoReadSetting } from '@/service/syncEngine';
import useDeviceDetails from '@/hooks/useDeviceDetails';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import * as Clipboard from 'expo-clipboard';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

// A clipboard entry with content already decrypted for display.
interface DecryptedClip extends CustomClipboard {
	legacy?: boolean;
}

const clipId = (clip: CustomClipboard): string => clip._id || clip.id || '';

const decryptClip = (mk: Uint8Array, clip: CustomClipboard): DecryptedClip => {
	if (isEnvelope(clip.content)) {
		try {
			return { ...clip, content: decryptEntry(mk, clip.content) };
		} catch {
			return { ...clip, content: '[Unable to decrypt]' };
		}
	}
	// Pre-encryption (legacy) plaintext entry.
	return { ...clip, content: clip.content, legacy: true };
};

export default function Homepage() {
	const t = useTheme();
	const styles = useThemedStyles(makeStyles);
	const [saveTextData, setSaveTextData] = useState('');
	const [clipboardEntries, setClipboardEntries] = useState<DecryptedClip[]>([]);
	const [latestText, setLatestText] = useState<string | null>(null);
	const [alertVisible, setAlertVisible] = useState(false);
	const [alertMessage, setAlertMessage] = useState('');
	const [confirmationVisible, setConfirmationVisible] = useState(false);
	const [legacyPromptVisible, setLegacyPromptVisible] = useState(false);
	const { user, encryptionReady } = useAuth();
	const navigation = useNavigation();
	const { deviceId, deviceName } = useDeviceDetails();
	const legacyPromptShownRef = useRef(false);
	const syncingRef = useRef(false);

	const showAlert = (message: string) => {
		setAlertMessage(message);
		setAlertVisible(true);
		setTimeout(() => setAlertVisible(false), 3000);
	};

	const handleCopy = (text: string) => {
		setClipboard(text, showAlert, 'Copied to clipboard');
	};

	const applyEntries = (entries: DecryptedClip[]) => {
		setClipboardEntries(entries);
		setLatestText(entries[0]?.content ?? null);
		if (!legacyPromptShownRef.current && entries.some(e => e.legacy)) {
			legacyPromptShownRef.current = true;
			setLegacyPromptVisible(true);
		}
	};

	/**
	 * Foreground sync: newest side wins. Runs on mount, on app foreground and
	 * on socket reconnect. Clipboard is only read/written when the auto-read
	 * setting allows it (off by default on iOS/web).
	 */
	const runForegroundSync = useCallback(async () => {
		if (!user || !encryptionReady || !deviceId || syncingRef.current) return;
		syncingRef.current = true;
		try {
			const mk = await getMasterKey();
			if (!mk) return;

			const clips = await apiService.getClipboards();
			const decrypted = clips.map(c => decryptClip(mk, c));
			applyEntries(decrypted);

			const latest = decrypted[0] && !decrypted[0].legacy
				? { id: clipId(decrypted[0]), text: decrypted[0].content }
				: null;

			const autoRead = await getAutoReadSetting();
			let deviceText: string | null = null;
			if (autoRead) {
				try {
					deviceText = await getClipboard();
				} catch {
					// Web without clipboard permission, etc.
				}
			}

			const state = await getSyncState();
			const decision = decide(deviceText, latest, state);

			if (decision.action === 'push') {
				const saved = await socketService.createClipboard(
					deviceId,
					deviceName ?? 'Unknown device',
					encryptEntry(mk, decision.text)
				);
				const savedDecrypted: DecryptedClip = { ...saved, content: decision.text };
				applyEntries([savedDecrypted, ...decrypted]);
				await setSyncState({ lastSyncedHash: hashText(decision.text), lastSeenServerId: clipId(saved) });
				showAlert('Clipboard synced to your devices');
			} else if (decision.action === 'pull') {
				if (autoRead) {
					try {
						await Clipboard.setStringAsync(decision.entry.text);
						showAlert('Latest entry copied to your clipboard');
					} catch {
						// Clipboard write blocked — list is still up to date.
					}
				}
				await setSyncState({ lastSyncedHash: hashText(decision.entry.text), lastSeenServerId: decision.entry.id });
			} else if (latest) {
				// Nothing to move; just remember what we've seen.
				await setSyncState({ ...state, lastSeenServerId: latest.id });
			}
		} catch {
			showAlert('Sync failed — check your connection');
		} finally {
			syncingRef.current = false;
		}
	}, [user, encryptionReady, deviceId, deviceName]);

	const handleSave = async (text: string) => {
		if (!user || !deviceId) return;
		text = text.trim();
		if (!text) {
			showAlert('Please enter some text to save!');
			return;
		}
		try {
			const mk = await getMasterKey();
			if (!mk) {
				showAlert('Unlock your data first');
				return;
			}
			const saved = await socketService.createClipboard(deviceId, deviceName ?? 'Unknown device', encryptEntry(mk, text));
			applyEntries([{ ...saved, content: text }, ...clipboardEntries]);
			await setSyncState({ lastSyncedHash: hashText(text), lastSeenServerId: clipId(saved) });
			setSaveTextData('');
			showAlert('Text saved to your clipboard history');
		} catch {
			showAlert('Could not save — check your connection and try again');
		}
	};

	const handleBulkDelete = async () => {
		if (!user) return;
		try {
			await socketService.clearAllClipboards();
			applyEntries([]);
			showAlert('Deleted all clipboard entries');
		} catch {
			showAlert('Failed to delete entries — try again');
		}
	};

	const handleDeleteLegacy = async () => {
		setLegacyPromptVisible(false);
		const legacyEntries = clipboardEntries.filter(e => e.legacy);
		try {
			await Promise.all(legacyEntries.map(e => apiService.deleteClipboard(clipId(e))));
			applyEntries(clipboardEntries.filter(e => !e.legacy));
			showAlert('Old unencrypted entries deleted');
		} catch {
			showAlert('Failed to delete some old entries');
		}
	};

	useEffect(() => {
		if (!(user && encryptionReady && deviceId)) return;
		let active = true;

		const init = async () => {
			try {
				await socketService.connect();
			} catch {
				if (active) showAlert('Could not connect to the sync server');
				return;
			}

			socketService.onClipboardNew(async (clip) => {
				const mk = await getMasterKey();
				if (!mk || !active) return;
				const decrypted = decryptClip(mk, clip);
				setClipboardEntries(prev => [decrypted, ...prev]);
				setLatestText(decrypted.content);

				// Copy to this device's clipboard only when allowed AND the user
				// hasn't copied something newer locally in the meantime.
				const state = await getSyncState();
				const autoRead = await getAutoReadSetting();
				if (autoRead) {
					try {
						const current = (await getClipboard())?.trim() ?? '';
						if (!current || hashText(current) === state.lastSyncedHash) {
							await Clipboard.setStringAsync(decrypted.content);
							await setSyncState({ lastSyncedHash: hashText(decrypted.content), lastSeenServerId: clipId(clip) });
							showAlert(`Synced from ${decrypted.deviceName}`);
							return;
						}
					} catch {
						// fall through to just marking as seen
					}
				}
				await setSyncState({ ...state, lastSeenServerId: clipId(clip) });
			});

			socketService.onClipboardDeleted(({ id }) => {
				setClipboardEntries(prev => prev.filter(c => clipId(c) !== id));
			});

			socketService.onClipboardCleared(() => {
				setClipboardEntries([]);
				setLatestText(null);
			});

			socketService.onReconnect(() => {
				runForegroundSync();
			});

			await runForegroundSync();
		};

		init();

		const subscription = AppState.addEventListener('change', (nextState) => {
			if (nextState === 'active') runForegroundSync();
		});

		return () => {
			active = false;
			subscription.remove();
			socketService.disconnect();
		};
	}, [user, encryptionReady, deviceId, runForegroundSync]);

	return (
		<>
			<Alert message={alertMessage} visible={alertVisible} />
			<Confirmation
				message="Delete all clipboard entries?"
				subtitle="This removes them from all your devices."
				visible={confirmationVisible}
				buttons={[
					{ label: 'No', onPress: () => setConfirmationVisible(false) },
					{ label: 'Yes', onPress: () => { setConfirmationVisible(false); handleBulkDelete(); } },
				]}
			/>
			<Confirmation
				message="Old unencrypted entries found"
				subtitle="Entries saved before encryption was enabled are stored unencrypted. Delete them?"
				visible={legacyPromptVisible}
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
					<Header navigation={navigation} />
					<ThemedView style={styles.centerContainer}>
						{!user ? (
							<Description />
						) : (
							<>
								<ThemedView style={styles.container}>
									<View style={styles.headerWithButton}>
										<ThemedText type="defaultSemiBold" style={styles.text}>Your latest copied text</ThemedText>
										<View style={styles.buttonContainer}>
											<TouchableOpacity style={[styles.copyButton, { marginLeft: 10 }]} onPress={() => handleCopy(latestText || '')}>
												<Ionicons name="clipboard-outline" size={24} color={t.icon} />
												{Platform.OS === 'web' && (
													<Text style={[styles.copyButtonText, { color: t.text }]}> Copy Text</Text>
												)}
											</TouchableOpacity>
										</View>
									</View>
									<View style={styles.catContainer}>
										<View style={styles.catBody}>
											<ScrollView
												scrollEnabled={true}
												nestedScrollEnabled={true}
											>
												<Text style={styles.catBodyText}>{latestText}</Text>
											</ScrollView>
										</View>
									</View>
								</ThemedView>
								<ThemedView style={styles.container}>
									<View style={styles.headerWithButton}>
										<ThemedText type="defaultSemiBold" style={styles.text}>Save to clipboard</ThemedText>
										<View style={styles.buttonContainer}>
											<TouchableOpacity style={styles.copyButton} onPress={() => handleSave(saveTextData)}>
												<Ionicons name="save-outline" size={24} color={t.icon} />
												{Platform.OS === 'web' && (
													<Text style={[styles.copyButtonText, { color: t.text }]}> Save Text</Text>
												)}
											</TouchableOpacity>
										</View>
									</View>
									<View style={styles.catContainer}>
										<View style={styles.catBody}>
											<ScrollView
												scrollEnabled={true}
												nestedScrollEnabled={true}
											>
												<TextInput
													style={[
														{ height: 198, padding: 10, textAlignVertical: 'top' }
													]}
													placeholder='Enter your text here...'
													placeholderTextColor={t.placeholder}
													value={saveTextData}
													onChangeText={setSaveTextData}
													multiline={true}
													editable={true}
													selectionColor={t.text}
												/>
											</ScrollView>
										</View>
									</View>
								</ThemedView>
								<ThemedView style={styles.container}>
									<View style={styles.headerWithButton}>
										<ThemedText type="defaultSemiBold" style={styles.text}>Your Clipboard Entries ({clipboardEntries.length})</ThemedText>
										<TouchableOpacity style={styles.copyButton} onPress={() => setConfirmationVisible(true)}>
											<Ionicons name="trash-outline" size={24} color={t.icon} />
											{Platform.OS === 'web' && (
												<Text style={[styles.copyButtonText, { color: t.text }]}> Delete all Entries</Text>
											)}
										</TouchableOpacity>
									</View>
									<ClipboardScreen clipboardEntries={clipboardEntries} showAlert={showAlert} />
								</ThemedView>
							</>
						)}
					</ThemedView>
				</SafeAreaView>
			</ScrollView>
		</>
	);
}

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
	catBody: {
		height: 200,
		borderWidth: 1,
		borderColor: t.border,
		borderRadius: 4,
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
	},
	text: {
		color: t.text
	},
	centerContainer: {
		backgroundColor: t.background,
		padding: Platform.OS === 'web' ? 16 : 5,
		paddingTop: 2,
		borderRadius: 16,
	},
	catContainer: {
		backgroundColor: t.background,
		paddingTop: 2,
		borderRadius: 16,
	},
	container: {
		backgroundColor: t.background,
		padding: 10,
		borderRadius: 16,
		overflow: 'hidden'
	},
	buttonContainer: {
		flexDirection: 'row',
		marginLeft: 10,
	},
	headerWithButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: '100%',
	},
	copyButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 8,
		borderRadius: 5,
	},
	copyButtonText: {
		marginLeft: 5,
		fontWeight: '500',
	},
});
