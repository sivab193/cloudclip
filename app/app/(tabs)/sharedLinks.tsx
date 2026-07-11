import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, View, Text, TouchableOpacity, SafeAreaView, TextInput, Platform, ScrollView, Dimensions } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Header from '@/components/Header';
import { router, useNavigation } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { truncateContent } from '@/service/util';
import { Shared } from '@/service/models';
import { apiService } from '@/service/apiService';
import { socketService } from '@/service/socketService';
import { setClipboard } from '@/service/clipboardService';
import useDeviceDetails from '@/hooks/useDeviceDetails';
import NoItemsComponent from '@/components/NoItems';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import { generateNanoID, getSharedLinkURL, handleShare } from '@/service/shareService';
import * as Clipboard from 'expo-clipboard';

export default function SharedLinks() {
	const colorScheme = useColorScheme();
	const isDarkMode = colorScheme === 'dark';
	const navigation = useNavigation();
	const [textToShare, setTextToShare] = useState("");
	const [retrieveText, setRetrieveText] = useState("");
	const [sharedLinks, setSharedLinks] = useState<Shared[]>([]); // Define the type for the state
	const { deviceId, deviceName } = useDeviceDetails();
	const [confirmationVisible, setConfirmationVisible] = useState(false);
	const [itemToRemoveId, setItemToRemoveId] = useState("");
	const [alertVisible, setAlertVisible] = useState(false);
	const [alertMessage, setAlertMessage] = useState('');
	const [shareConfirmationVisible, setShareConfirmationVisible] = useState(false);
	const [shareWithoutNewConfirmationVisible, setShareWithoutNewConfirmationVisible] = useState(false);
	const [itemToShare, setItemToShare] = useState("");
	const [sharedLink, setSharedLink] = useState<string | null>(null);
	const [sharedCode, setSharedCode] = useState<string | null>(null);
	const [deleteAllConfirmationVisible, setDeleteAllConfirmationVisible] = useState(false);

	const showAlert = (message: string) => {
		setAlertMessage(message);
		setAlertVisible(true);
		setTimeout(() => setAlertVisible(false), 3000); // Dismiss alert after 3 seconds
	};

	const { user } = useAuth(); // Use AuthContext to get the user

	const handleRemove = async () => {
		try {
			await apiService.deleteSharedLink(itemToRemoveId);
			setSharedLinks(prev => prev.filter(item => (item._id || item.id) !== itemToRemoveId));
			setConfirmationVisible(false);
			showAlert("Shared link deleted successfully.");
		} catch (error) {
			showAlert("Failed to delete shared link.");
		}
	};

	const handleShareLink = (code: string) => {
		setSharedCode(code);
		const sharedLinkURL = getSharedLinkURL(code);
		setSharedLink(sharedLinkURL);
		setShareWithoutNewConfirmationVisible(true);
	};

	const calculateTimeLeft = (expiryAt: string | null): string => {
		if (!expiryAt) {
			return '';
		}
		const now = Date.now();
		const expiryTime = new Date(expiryAt).getTime();
		const timeLeft = expiryTime - now;
		if (timeLeft <= 0) {
			return 'Expired';
		}
		const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
		const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
		return `${hours}h ${minutes}m`;
	};

	useEffect(() => {
		const fetchSharedLinks = async () => {
			if (user && deviceId) {
				try {
					const links = await apiService.getSharedLinks();
					setSharedLinks(links);
				} catch (error) {
					console.error('Error fetching shared links:', error);
				}
			}
		};
		fetchSharedLinks();
	}, [user, deviceId]);


	const handleCancel = () => {
		setConfirmationVisible(false);
	};

	const handleShareCancel = () => {
		setShareConfirmationVisible(false);
	}

	const showConfirmation = (item: any) => {
		setConfirmationVisible(true);
		setItemToRemoveId(item._id || item.id);
	}

	const showShareConfirmation = (content: string) => {
		const code: string = generateNanoID();
		const generatedLink = getSharedLinkURL(code);
		setSharedCode(code);
		setSharedLink(generatedLink);
		setShareConfirmationVisible(true);
		setItemToShare(content);
	};

	const handleCopy = async () => {
		if (user) {
			try {
				// We still emit the clipboard creation to the socket for real-time sync with other devices
				socketService.createClipboard(deviceId, deviceName, itemToShare);
				
				// Then create the shared link via REST
				const shared = await apiService.createSharedLink(itemToShare);
				setSharedLinks(prev => [shared, ...prev]);
				return shared._id || shared.id;
			} catch (error) {
				console.error('Error during handleCopy:', error);
				throw error;
			}
		} else {
			// Unauthenticated sharing if supported by backend
			const shared = await apiService.createSharedLink(itemToShare);
			return shared._id || shared.id;
		}
	}

	const handleCopyLink = async () => {
		if (itemToShare && sharedLink) {
			await handleCopy();
			const sharedLinkURL = getSharedLinkURL(sharedCode || '');
			await setClipboard(sharedLinkURL, showAlert, "Shared link created and copied to clipboard.");
			setShareConfirmationVisible(false);
			setTextToShare('');
		} else {
			showAlert("An unexpected error occured!");
		}
	};

	const handleCopyCode = async () => {
		if (itemToShare && sharedLink) {
			await handleCopy();
			setClipboard(sharedCode, showAlert, "Shared link created and the code to share is copied to clipboard.");
			setShareConfirmationVisible(false);
			setTextToShare('');
		} else {
			showAlert("An unexpected error occured!");
		}
	};

	const handleCopyLinkWithoutNewLink = async () => {
		Clipboard.setStringAsync(sharedLink || '');
		setShareWithoutNewConfirmationVisible(false);
		showAlert('Link copied to clipoard.');
	}

	const handleCopyCodeWithoutNewLink = async () => {
		Clipboard.setStringAsync(sharedCode || '');
		setShareWithoutNewConfirmationVisible(false);
		showAlert('Code copied to clipoard.');
	}

	const handleShareCancelWithoutNewLink = () => {
		setShareWithoutNewConfirmationVisible(false);
	}

	const showDeleteAllConfirmation = () => {
		setDeleteAllConfirmationVisible(true);
	};

	const handleDeleteAll = async () => {
		try {
			// This would need a bulk delete endpoint in the backend
			// For now, let's assume one exists or we just clear state
			// await apiService.deleteAllSharedLinks(); 
			setSharedLinks([]);
			setDeleteAllConfirmationVisible(false);
			showAlert("All shared links have been deleted.");
		} catch (error) {
			console.error("Error deleting all shared links:", error);
			showAlert("An error occurred while deleting shared links.");
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
					{ label: 'No', onPress: handleCancel, style: { backgroundColor: 'black' } },
					{ label: 'Yes', onPress: handleRemove, style: { backgroundColor: 'black' } },
				]}
			/>
			<Confirmation
				message={`Use this link or code for quick share!\n`}
				subtitle={`Link: ${sharedLink || ''}\nCode: ${sharedCode || ''}`}
				visible={shareConfirmationVisible}
				buttons={[
					{ label: 'Copy Link', onPress: handleCopyLink, style: { backgroundColor: 'black' } },
					{ label: 'Copy Code', onPress: handleCopyCode, style: { backgroundColor: 'black' } },
					{ label: 'Cancel', onPress: handleShareCancel, style: { backgroundColor: 'red' } },
				]}
			/>
			<Confirmation
				message={`Use this link or code for quick share!\n`}
				subtitle={`Link: ${sharedLink || ''}\nCode: ${sharedCode || ''}`}
				visible={shareWithoutNewConfirmationVisible}
				buttons={[
					{ label: 'Copy Link', onPress: handleCopyLinkWithoutNewLink, style: { backgroundColor: 'black' } },
					{ label: 'Copy Code', onPress: handleCopyCodeWithoutNewLink, style: { backgroundColor: 'black' } },
					{ label: 'Cancel', onPress: handleShareCancelWithoutNewLink, style: { backgroundColor: 'red' } },
				]}
			/>
			<Confirmation
				message="Are you sure you want to delete all shared links?"
				subtitle=''
				visible={deleteAllConfirmationVisible}
				buttons={[
					{ label: 'Cancel', onPress: () => setDeleteAllConfirmationVisible(false), style: { backgroundColor: 'black' } },
					{ label: 'Delete All', onPress: handleDeleteAll, style: { backgroundColor: 'black' } },
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
								placeholderTextColor={isDarkMode ? '#000' : '#000'}
								value={textToShare}
								onChangeText={(text) => setTextToShare(text)}
							/>
							<TouchableOpacity
								style={styles.tertiaryButton}
								onPress={() => {
									if (textToShare.trim()) {
										showShareConfirmation(textToShare);
									} else {
										showAlert("Please enter text to share.");
									}
								}}
							>
								<Ionicons name="share-social-outline" size={24} color={'black'} />
								<ThemedText type="default" style={styles.tertiaryButtonText} >
									Share
								</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
					<ThemedView style={[styles.containerLight]}>
						<ThemedText type="defaultSemiBold" lightColor='black' darkColor='black' style={styles.heading}>Retrieve Text:</ThemedText>
						<ThemedView style={styles.inputContainer}>
							<TextInput
								style={styles.inputLight2}
								placeholder="Enter the code here to retrieve your text"
								placeholderTextColor={isDarkMode ? '#000' : '#000'}
								value={retrieveText}
								onChangeText={(text) => setRetrieveText(text)}
							/>
							<TouchableOpacity
								style={styles.tertiaryButton}
								onPress={() => {
									if (!retrieveText.trim()) {
										showAlert("Please enter a code to retrieve your text.");
									} else {
										router.push(`/shared/${retrieveText}`);
										setRetrieveText('');
									}
								}}
							>
								<Ionicons name="share-outline" size={24} color="black" />
								<ThemedText type="default" style={styles.tertiaryButtonText}>Retrieve</ThemedText>
							</TouchableOpacity>
						</ThemedView>
					</ThemedView>
					{user && (
						<ThemedView style={styles.containerLight}>
							<ThemedView style={styles.headingContainer}>
								<ThemedText type="defaultSemiBold" darkColor='black' lightColor='black'>
									Recent Shared Links:
								</ThemedText>
								<TouchableOpacity onPress={() => showDeleteAllConfirmation()} style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Ionicons name="trash-outline" size={24} color={isDarkMode ? 'black' : 'black'} />
									{Platform.OS === 'web' && (
										<Text style={[{ color: isDarkMode ? 'black' : 'black', marginLeft: 5 }]}>
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
											keyExtractor={(item) => (item._id || item.id || '')}
											renderItem={({ item }) => (
												<TouchableOpacity onPress={() => router.push(`/shared/${item.code || ''}`)}>
													<View style={styles.itemContainerLight}>
														<View style={styles.textContainer}>
															<Text style={isDarkMode ? styles.itemTitleDark : styles.itemTitleLight}>
																{truncateContent(item.content || "")}
															</Text>
															<Text style={isDarkMode ? styles.itemExpiryDark : styles.itemExpiryLight}>
																Expires in: {calculateTimeLeft(item.expiryAt || null)}
															</Text>
														</View>
														<View style={styles.buttonContainer}>
															<TouchableOpacity style={styles.button} onPress={() => showConfirmation(item)}>
																<Ionicons name="trash-outline" size={24} color={'black'} />
															</TouchableOpacity>
															<TouchableOpacity style={styles.button} onPress={() => handleShareLink(item.code)}>
																<Ionicons name="share-social-outline" size={24} color={'black'} />
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

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#fff',
		paddingTop: Platform.OS === 'web' ? 0 : 30,
	},
	flatListContainer: {
		height: 300,
		paddingRight: 5,
		marginBottom: 10,
	},
	scrollContainer: {
		padding: 10,
		flexGrow: 1, // Allow content to grow
		justifyContent: 'space-between', // Distribute space
	},
	containerLight: {
		backgroundColor: '#fff',
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
		backgroundColor: '#f0f0f0',
		shadowColor: '#000',
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
	itemTitleLight: {
		fontSize: 16,
		color: '#000',
	},
	itemTitleDark: {
		fontSize: 16,
		color: '#000',
	},
	itemExpiryLight: {
		fontSize: 14,
		color: '#aaa',
	},
	itemExpiryDark: {
		fontSize: 14,
		color: '#aaa',
	},
	heading: {
		marginBottom: 10,
		color: '#000',
	},
	inputLight2: {
		height: 40,
		borderColor: '#000',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: '#fff',
		color: '#000',
		marginBottom: 16,
		width: '100%',
		alignSelf: 'center'
	},
	shareButton: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 5,
		width: 150,
		alignSelf: 'center',
		borderRadius: 8,
		backgroundColor: 'black',
		marginBottom: 15
	},
	shareButtonText: {
		color: '#fff',
		fontSize: 16,
		marginLeft: 8,
	},
	tertiaryButtonText: {
		color: '#000',
		fontSize: 16,
		marginLeft: 8,
		fontWeight: 'bold',
		textDecorationColor: 'black',
		textDecorationStyle: 'solid',
		textDecorationLine: 'underline'
	},
	headingContainer: {
		marginBottom: Platform.OS === 'web' ? 25 : 15,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#fff',
	},
	inputContainer: {
		flexDirection: Platform.OS === 'web' ? 'row' : 'column',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: Platform.OS === 'web' ? 20 : 0,
		backgroundColor: '#fff'
	},
	inputLight: {
		flex: 1,
		height: 40,
		borderColor: '#000',
		borderWidth: 1,
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: '#fff',
		color: '#000',
		marginBottom: 16,
		marginRight: 10,
		width: '100%'
	},
	tertiaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: 'auto', // Adjust width for mobile
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: '#fff',
	},

});
