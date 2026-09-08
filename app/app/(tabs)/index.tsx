import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Platform } from 'react-native';
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

export default function Homepage() {
 const t = useTheme();
 const styles = useThemedStyles(makeStyles);
 const [saveTextData, setSaveTextData] = useState('');
 const [alertVisible, setAlertVisible] = useState(false);
 const [alertMessage, setAlertMessage] = useState('');
 const [confirmationVisible, setConfirmationVisible] = useState(false);
 const [legacyPromptVisible, setLegacyPromptVisible] = useState(false);
 const { user } = useAuth();
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
					<Header />
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
											<TouchableOpacity accessibilityRole="button" accessibilityLabel="Paste from clipboard" style={styles.copyButton} onPress={handlePaste}>
												<Ionicons name="clipboard-outline" size={24} color={t.icon} />
												<Text style={{ color: t.text }}> Paste</Text>
											</TouchableOpacity>
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
														{ height: 198, padding: 10, textAlignVertical: 'top', color: t.text }
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
									<ClipboardScreen clipboardEntries={clipboardEntries} showAlert={showAlert} onDelete={remove} />
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
