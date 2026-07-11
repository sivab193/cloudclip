import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Header from '../../components/Header';
import Description from '@/components/Description';
import { useNavigation } from 'expo-router';
import { useAuth } from '@/auth/AuthContext'; // Import AuthContext
import ClipboardScreen from '@/components/Clipboard';
import { getClipboard, setClipboard } from '@/service/clipboardService';
import { apiService } from '@/service/apiService';
import { socketService } from '@/service/socketService';
import { CustomClipboard } from '@/service/models';
import useDeviceDetails from '@/hooks/useDeviceDetails';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';

export default function Homepage() {
	const colorScheme = useColorScheme();
	const isDarkMode = colorScheme === 'dark';

	interface ClipboardData {
		content: string | null;
		timestamp: string | null; // Use ISO string instead of Firestore Timestamp
	}

	const [saveTextData, setSaveTextData] = useState("");
	const [clipboardEntries, setClipboardEntries] = useState<CustomClipboard[]>([]);
	const [alertVisible, setAlertVisible] = useState(false);
	const [alertMessage, setAlertMessage] = useState('');
	const [confirmationVisible, setConfirmationVisible] = useState(false);
	const { user } = useAuth(); // Use AuthContext to get the user
	const [data, setData] = useState<ClipboardData>({
		content: null,
		timestamp: null // Initialize with current timestamp or another default value
	});
	const [clipboardData, setclipboardData] = useState<ClipboardData>({
		content: null,
		timestamp: null // Initialize with current timestamp or another default value
	});
	const navigation = useNavigation();
	const { deviceId, deviceName } = useDeviceDetails();

	const showConfirmation = () => {
		setConfirmationVisible(true);
	};

	const handleCancel = () => {
		setConfirmationVisible(false);
	};

	const handleRemove = () => {
		setConfirmationVisible(false);
		handleBulkDelete();
	};

	const showAlert = (message: string) => {
		setAlertMessage(message);
		setAlertVisible(true);
		setTimeout(() => setAlertVisible(false), 3000); // Dismiss alert after 3 seconds
	};

	const handleCopy = (text: string) => {
		setClipboard(text, showAlert, "Copied to clipboard"); // Pass the showAlert function
	};

	const handleSave = (text: string) => {
		if (user && deviceId) {
			if (text) {
				text = text.trim();
				socketService.createClipboard(deviceId, deviceName, text);
				showAlert("Text saved to clipboard");
				setSaveTextData('');
			} else {
				showAlert("Please enter some text to save!")
			}
		}
	};

	const handleBulkDelete = async () => {
		if (user) {
			try {
				socketService.clearAllClipboards();
				showAlert('Deleted all clipboard entries');
			} catch (error) {
				showAlert('Failed to perform bulk delete');
			}
		}
	};

	const refresh = (clipboards: CustomClipboard[]) => {
		setClipboardEntries(clipboards);
		console.log(clipboards.length);
		if (clipboards.length !== 0) {
			const recent = clipboards[0]?.content;
			setData({ content: recent, timestamp: new Date().toISOString() });
			setClipboard(recent, showAlert, "Copied to clipboard"); // Pass the showAlert function
		}
	}

	const prevDataRef = useRef(data.content);

	useEffect(() => {
		prevDataRef.current = data.content;
	}, [data.content]);

	useEffect(() => {
		let clipboardIntervalId: ReturnType<typeof setInterval> | undefined;

		const init = async () => {
			if (user && deviceId) {
				await socketService.connect();
				
				// Fetch initial entries via REST
				const initialEntries = await apiService.getClipboards();
				refresh(initialEntries);

				// Listen for real-time updates via Socket.io
				socketService.onClipboardNew((clip) => {
					setClipboardEntries(prev => [clip, ...prev]);
					setData({ content: clip.content, timestamp: clip.createdAt || new Date().toISOString() });
					setClipboard(clip.content, showAlert, "Synced from other device");
				});

				socketService.onClipboardDeleted(({ id }) => {
					setClipboardEntries(prev => prev.filter(c => (c._id || c.id) !== id));
				});

				socketService.onClipboardCleared(() => {
					setClipboardEntries([]);
					setData({ content: null, timestamp: null });
				});
			} else if (user) {
				clipboardIntervalId = setInterval(() => {
					getClipboard()
						.then(async (text) => {
							text = text.trim();
							if (text !== prevDataRef.current && text !== '') {
								setData({ content: text, timestamp: new Date().toISOString() });
								setclipboardData({ content: text, timestamp: new Date().toISOString() });
								socketService.createClipboard(deviceId, deviceName, text);
							}
						})
						.catch(() => { });
				}, 1000);
			}
		};

		init();

		return () => {
			socketService.disconnect();
			if (clipboardIntervalId) clearInterval(clipboardIntervalId);
		};
	}, [user, deviceId]);

	const inputRef = useRef(null);

	useEffect(() => {
		if (inputRef.current) {
			(inputRef.current as any).focus();
		}
	}, []);

	return (
		<>
			<Alert message={alertMessage} visible={alertVisible} />
			<Confirmation
				message="Are you sure you want to proceed?"
				subtitle=''
				visible={confirmationVisible}
				buttons={[
					{ label: 'No', onPress: handleCancel, style: { backgroundColor: 'black' } },
					{ label: 'Yes', onPress: handleRemove, style: { backgroundColor: 'black' } },
				]}
			/>
			<ScrollView
				contentContainerStyle={{ flexGrow: 1 }}
				showsVerticalScrollIndicator={false} // Optional: hides the vertical scrollbar
				horizontal={false} // Ensures horizontal scrolling is disabled
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
											<TouchableOpacity style={[styles.copyButton, { marginLeft: 10 }]} onPress={() => handleCopy(data.content || '')}>
												<Ionicons name="clipboard-outline" size={24} color={isDarkMode ? 'black' : 'black'} />
												{Platform.OS === 'web' && (
													<Text style={[styles.copyButtonText, { color: isDarkMode ? 'black' : 'black' }]}> Copy Text</Text>
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
												<Text style={styles.catBodyText}>{data.content}</Text>
											</ScrollView>
										</View>
									</View>
								</ThemedView>
								<ThemedView style={styles.container}>
									<View style={styles.headerWithButton}>
										<ThemedText type="defaultSemiBold" style={styles.text}>Save to clipboard</ThemedText>
										<View style={styles.buttonContainer}>
											<TouchableOpacity style={styles.copyButton} onPress={() => handleSave(saveTextData)}>
												<Ionicons name="save-outline" size={24} color={isDarkMode ? 'black' : 'black'} />
												{Platform.OS === 'web' && (
													<Text style={[styles.copyButtonText, { color: isDarkMode ? 'black' : 'black' }]}> Save Text</Text>
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
													ref={inputRef}
													style={[
														{ height: 198, padding: 10, textAlignVertical: 'top' }
													]}
													placeholder='Enter your text here...'
													value={saveTextData}
													onChangeText={setSaveTextData}
													multiline={true} // Allows text to wrap and expand vertically
													editable={true} // Makes the text input editable
													selectionColor={'black'}
												/>
											</ScrollView>
										</View>
									</View>
								</ThemedView>
								<ThemedView style={styles.container}>
									<View style={styles.headerWithButton}>
										<ThemedText type="defaultSemiBold" style={styles.text}>Your Clipboard Entries ({clipboardEntries.length})</ThemedText>
										<TouchableOpacity style={styles.copyButton} onPress={() => showConfirmation()}>
											<Ionicons name="trash-outline" size={24} color={isDarkMode ? 'black' : 'black'} />
											{Platform.OS === 'web' && (
												<Text style={[styles.copyButtonText, { color: isDarkMode ? 'black' : 'black' }]}> Delete all Entries</Text>
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

const styles = StyleSheet.create({
	catBody: {
		height: 200,
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 4,
		overflow: 'hidden'
	},
	catBodyText: {
		padding: 10,
		fontSize: 16,
		color: 'black',
	},
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
		paddingTop: Platform.OS === 'web' ? 0 : 30,
	},
	text: {
		color: '#000'
	},
	centerContainer: {
		backgroundColor: '#fff',
		padding: Platform.OS === 'web' ? 16 : 5,
		paddingTop: 2,
		borderRadius: 16,
	},
	catContainer: {
		backgroundColor: '#fff',
		// padding: Platform.OS === 'web' ? 16 : 5,
		paddingTop: 2,
		borderRadius: 16,
	},
	container: {
		backgroundColor: '#fff',
		padding: 10,
		borderRadius: 16,
		overflow: 'hidden'
	},
	listContent: {
		paddingBottom: 16,
	},
	itemContainerLight: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		marginBottom: 16,
		borderRadius: 8,
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
		elevation: 3,
	},
	itemContainerDark: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		marginBottom: 16,
		borderRadius: 8,
		backgroundColor: '#1e1e1e',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
		elevation: 3,
	},
	itemTitleLight: {
		fontSize: 18,
		color: '#000',
	},
	itemTitleDark: {
		fontSize: 18,
		color: '#fff',
	},
	itemExpiryLight: {
		fontSize: 14,
		color: '#666',
	},
	itemExpiryDark: {
		fontSize: 14,
		color: '#aaa',
	},
	itemContent: {
		flex: 1,
	},
	mainClipContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 10,
	},
	mainClipContent: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderRadius: 5,
	},
	mainClipContentLight: {
		backgroundColor: '#fff',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
		elevation: 3,
	},
	mainClipContentDark: {
		backgroundColor: '#1e1e1e',
		shadowColor: '#000',
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 8,
		elevation: 3,
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
		fontWeight: 'medium',
	},
	scrollView: {
		flex: 1,
	},
	iconButton: {
		marginLeft: 10,
	},
});
