import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, SafeAreaView, FlatList, Platform, Modal, TouchableWithoutFeedback, ScrollView, Dimensions, Switch, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { apiService } from '@/service/apiService';
import { getDeviceOS } from '@/service/deviceService';
import { rewrapWithNewPassword, regenerateRecoveryCode, lockLocal } from '@/service/keyService';
import { getAutoReadSetting, setAutoReadSetting, clearSyncState } from '@/service/syncEngine';
import { Device } from '@/service/models';
import Header from '@/components/Header';
import { useNavigation } from 'expo-router';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import RecoveryCodeModal from '@/components/RecoveryCodeModal';
import useDeviceDetails from '@/hooks/useDeviceDetails';
import NoItemsComponent from '@/components/NoItems';

export default function Account() {
    const [name, setName] = useState('');
    const [devices, setDevices] = useState<Device[]>([]);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [formDeviceName, setFormDeviceName] = useState('');
    const [isWideScreen, setIsWideScreen] = useState(Dimensions.get('window').width >= 768);

    const { user, logout, encryptionReady } = useAuth();
    const email = user?.email || '';
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);
    const { deviceId, deviceName } = useDeviceDetails();

    // Security section state
    const [autoRead, setAutoRead] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordBusy, setPasswordBusy] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [recoveryConfirmVisible, setRecoveryConfirmVisible] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
    const [deleteFinalVisible, setDeleteFinalVisible] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const navigation = useNavigation();

    const showAlert = (message: string) => {
        setAlertVisible(true);
        setAlertMessage(message);
        setTimeout(() => setAlertVisible(false), 3000);
    };

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', () => {
            setIsWideScreen(Dimensions.get('window').width >= 768);
        });

        const initialize = async () => {
            try {
                if (user) {
                    const userData = await apiService.syncUser();
                    if (userData) setName(userData.name);
                    const fetchedDevices = await apiService.getDevices();
                    setDevices(fetchedDevices);
                    setAutoRead(await getAutoReadSetting());
                }
            } catch {
                // Backend unreachable; screen still renders.
            }
        };
        initialize();

        return () => subscription.remove();
    }, [user, deviceId]);

    const handleSaveName = async () => {
        if (!user) return;
        try {
            await apiService.syncUser(name);
            showAlert('Account information saved!');
        } catch {
            showAlert('Failed to save account information');
        }
    };

    const handleToggleAutoRead = async (value: boolean) => {
        setAutoRead(value);
        await setAutoReadSetting(value);
        if (Platform.OS === 'ios' && value) {
            showAlert('Note: iOS shows a paste banner whenever the app reads the clipboard.');
        }
    };

    const handleRenameDevice = async () => {
        if (formDeviceName.trim().length < 3) {
            setErrorMessage('Device name must be at least 3 characters long.');
            return;
        }
        if (deviceId && user) {
            try {
                await apiService.registerDevice(deviceId, formDeviceName.trim(), getDeviceOS());
                setRenameModalVisible(false);
                setFormDeviceName('');
                setErrorMessage('');
                setDevices(await apiService.getDevices());
                showAlert('Device name updated!');
            } catch {
                setErrorMessage('Failed to update device.');
            }
        }
    };

    const handleRemoveDevice = async () => {
        setConfirmationVisible(false);
        if (!deviceToRemove) return;
        try {
            await apiService.deleteDevice(deviceToRemove.deviceId);
            setDevices(prev => prev.filter(d => d.deviceId !== deviceToRemove.deviceId));
            showAlert('Device removed successfully.');
        } catch {
            showAlert('Failed to remove device.');
        }
    };

    const handleChangePassword = async () => {
        setPasswordError('');
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPasswordError('Please fill in all fields.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }
        if (!user?.email) return;
        setPasswordBusy(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            // Re-wrap the E2E master key under the new password.
            await rewrapWithNewPassword(newPassword);
            setPasswordModalVisible(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            showAlert('Password changed successfully.');
        } catch (error: any) {
            if (error?.code === 'auth/invalid-credential' || error?.code === 'auth/wrong-password') {
                setPasswordError('Current password is incorrect.');
            } else if (error?.code === 'auth/weak-password') {
                setPasswordError('New password is too weak.');
            } else {
                setPasswordError('Failed to change password. Your data encryption is unchanged.');
            }
        } finally {
            setPasswordBusy(false);
        }
    };

    const handleRegenerateRecovery = async () => {
        setRecoveryConfirmVisible(false);
        try {
            const code = await regenerateRecoveryCode();
            setRecoveryCode(code);
        } catch (error) {
            showAlert(error instanceof Error ? error.message : 'Failed to generate recovery code.');
        }
    };

    const handleDeleteAccount = async () => {
        setDeleteFinalVisible(false);
        setDeleteBusy(true);
        try {
            await apiService.deleteAccount();
            await lockLocal();
            await clearSyncState();
            await logout();
            showAlert('Your account and all data have been deleted.');
        } catch {
            showAlert('Failed to delete account — please try again.');
        } finally {
            setDeleteBusy(false);
        }
    };

    const isCurrentDevice = (item: Device) => item.deviceId === deviceId;

    const renderItem = ({ item }: { item: Device }) => {
        return (
            <View style={[
                isCurrentDevice(item) ? styles.itemHighlighted : null,
                styles.itemContainerLight
            ]}>
                <View style={styles.textContainer}>
                    <Text style={styles.itemTitle}>
                        {item.deviceName}{isCurrentDevice(item) ? ' (this device)' : ''}
                    </Text>
                    <Text style={styles.itemSubtitle}>Type: {item.os}</Text>
                </View>
                <View style={styles.iconsContainer}>
                    {isCurrentDevice(item) && (
                        <TouchableOpacity onPress={() => { setFormDeviceName(item.deviceName); setRenameModalVisible(true); }} style={styles.iconButton}>
                            <Ionicons name="pencil-outline" size={24} color="black" />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => { setDeviceToRemove(item); setConfirmationVisible(true); }} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={24} color={'black'} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <>
            <Alert message={alertMessage} visible={alertVisible} />
            <Confirmation
                message="Remove this device?"
                visible={confirmationVisible}
                buttons={[
                    { label: 'No', onPress: () => setConfirmationVisible(false), style: { backgroundColor: 'black' } },
                    { label: 'Yes', onPress: handleRemoveDevice, style: { backgroundColor: 'black' } },
                ]}
                subtitle={''} />
            <Confirmation
                message="Generate a new recovery code?"
                subtitle="Your old recovery code will stop working."
                visible={recoveryConfirmVisible}
                buttons={[
                    { label: 'Cancel', onPress: () => setRecoveryConfirmVisible(false), style: { backgroundColor: 'black' } },
                    { label: 'Generate', onPress: handleRegenerateRecovery, style: { backgroundColor: 'black' } },
                ]}
            />
            <Confirmation
                message="Delete your account?"
                subtitle="This permanently deletes your account, all clipboard entries, shared links and devices. This cannot be undone."
                visible={deleteConfirmVisible}
                buttons={[
                    { label: 'Cancel', onPress: () => setDeleteConfirmVisible(false), style: { backgroundColor: 'black' } },
                    { label: 'Continue', onPress: () => { setDeleteConfirmVisible(false); setDeleteFinalVisible(true); }, style: { backgroundColor: '#b00020' } },
                ]}
            />
            <Confirmation
                message="Are you absolutely sure?"
                subtitle="All your data will be permanently erased."
                visible={deleteFinalVisible}
                buttons={[
                    { label: 'Keep my account', onPress: () => setDeleteFinalVisible(false), style: { backgroundColor: 'black' } },
                    { label: 'Delete forever', onPress: handleDeleteAccount, style: { backgroundColor: '#b00020' } },
                ]}
            />
            {recoveryCode && (
                <RecoveryCodeModal visible={true} code={recoveryCode} onDone={() => setRecoveryCode(null)} />
            )}
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                horizontal={false}
            >
                <SafeAreaView style={styles.safeArea}>
                    {/* Rename current device */}
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={renameModalVisible}
                        onRequestClose={() => setRenameModalVisible(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => setRenameModalVisible(false)}>
                            <View style={styles.modalContainer}>
                                <TouchableWithoutFeedback>
                                    <View style={styles.modalView}>
                                        <Text style={styles.modalText}>Device Name:</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formDeviceName}
                                            onChangeText={setFormDeviceName}
                                        />
                                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                                        <TouchableOpacity style={styles.buttonPrimary} onPress={handleRenameDevice}>
                                            <Text style={styles.buttonPrimaryText}>Save Device Name</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>

                    {/* Change password */}
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={passwordModalVisible}
                        onRequestClose={() => setPasswordModalVisible(false)}
                    >
                        <TouchableWithoutFeedback onPress={() => !passwordBusy && setPasswordModalVisible(false)}>
                            <View style={styles.modalContainer}>
                                <TouchableWithoutFeedback>
                                    <View style={styles.modalView}>
                                        <Text style={styles.modalText}>Change Password</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Current password"
                                            placeholderTextColor="#999"
                                            secureTextEntry
                                            value={currentPassword}
                                            onChangeText={setCurrentPassword}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="New password"
                                            placeholderTextColor="#999"
                                            secureTextEntry
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                        />
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Confirm new password"
                                            placeholderTextColor="#999"
                                            secureTextEntry
                                            value={confirmNewPassword}
                                            onChangeText={setConfirmNewPassword}
                                        />
                                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                                        <TouchableOpacity style={styles.buttonPrimary} onPress={handleChangePassword} disabled={passwordBusy}>
                                            {passwordBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonPrimaryText}>Change Password</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>

                    <Header navigation={navigation} />
                    <ThemedView style={styles.containerLight}>
                        {user ? (
                            <View style={isWideScreen ? styles.wideContent : styles.narrowContent}>
                                <ThemedText type="subtitle" style={{ color: 'black' }}>Your Account</ThemedText>
                                <Text>{'\n'}</Text>
                                <View style={styles.fieldContainer}>
                                    <ThemedText type="subtitle" style={styles.text}>Email</ThemedText>
                                    <TextInput
                                        style={styles.emailInput}
                                        value={email}
                                        editable={false}
                                    />
                                </View>
                                <View style={styles.fieldContainer}>
                                    <ThemedText type="subtitle" style={styles.text}>Name</ThemedText>
                                    <TextInput
                                        style={styles.inputLight}
                                        onChangeText={setName}
                                        value={name}
                                        placeholder="Enter your name"
                                        placeholderTextColor={'slategrey'}
                                    />
                                </View>
                                <TouchableOpacity style={styles.buttonPrimary} onPress={handleSaveName}>
                                    <Text style={styles.buttonPrimaryText}>Save</Text>
                                </TouchableOpacity>

                                <Text>{'\n'}</Text>
                                <ThemedView style={styles.containerLight}>
                                    <ThemedText type="subtitle" style={styles.text}>My Devices</ThemedText>
                                    {devices.length > 0 ? (
                                        <FlatList
                                            data={devices}
                                            keyExtractor={(item) => item.deviceId || ''}
                                            renderItem={renderItem}
                                            contentContainerStyle={styles.listContent}
                                        />) : (
                                        <NoItemsComponent></NoItemsComponent>
                                    )}
                                </ThemedView>

                                <Text>{'\n'}</Text>
                                <ThemedView style={styles.containerLight}>
                                    <ThemedText type="subtitle" style={styles.text}>Sync & Security</ThemedText>
                                    <View style={styles.settingRow}>
                                        <View style={styles.settingTextContainer}>
                                            <Text style={styles.settingTitle}>Read clipboard on open</Text>
                                            <Text style={styles.settingSubtitle}>
                                                Automatically sync what you copied when the app opens.
                                                {Platform.OS === 'ios' ? ' iOS shows a paste banner on every read.' : ''}
                                            </Text>
                                        </View>
                                        <Switch value={autoRead} onValueChange={handleToggleAutoRead} />
                                    </View>
                                    <TouchableOpacity style={styles.settingButton} onPress={() => setPasswordModalVisible(true)}>
                                        <Ionicons name="key-outline" size={20} color="black" />
                                        <Text style={styles.settingButtonText}>Change password</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.settingButton}
                                        onPress={() => encryptionReady ? setRecoveryConfirmVisible(true) : showAlert('Unlock your data first')}
                                    >
                                        <Ionicons name="shield-checkmark-outline" size={20} color="black" />
                                        <Text style={styles.settingButtonText}>Generate new recovery code</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.settingButton} onPress={() => setDeleteConfirmVisible(true)} disabled={deleteBusy}>
                                        <Ionicons name="trash-outline" size={20} color="#b00020" />
                                        <Text style={[styles.settingButtonText, styles.dangerText]}>
                                            {deleteBusy ? 'Deleting…' : 'Delete account & all data'}
                                        </Text>
                                    </TouchableOpacity>
                                </ThemedView>

                                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                                    <Text style={styles.logoutButtonText}>Click here to logout!</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ThemedView style={styles.containerCenter}>
                                <MaterialCommunityIcons name="hand-wave" size={24} color="black" />
                                <ThemedText type="subtitle" style={styles.text}>Hi there! {'\n'}</ThemedText>
                                <ThemedText type="subtitle" style={styles.text}>Welcome! Please log in to access your account and enjoy personalized features.
                                </ThemedText>
                            </ThemedView>
                        )}
                    </ThemedView >
                </SafeAreaView >
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'web' ? 0 : 30,
    },
    iconsContainer: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: 10,
    },
    text: {
        fontSize: 16,
        color: '#000',
    },
    textContainer: {
        flex: 1,
    },
    containerLight: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
    },
    fieldContainer: {
        marginBottom: 16,
    },
    inputLight: {
        height: 40,
        borderColor: '#000',
        borderWidth: 1,
        marginTop: 2,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
        color: '#000',
    },
    buttonPrimary: {
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#000',
        alignItems: 'center',
        minWidth: 100
    },
    buttonPrimaryText: {
        color: '#fff',
        fontSize: 16,
    },
    listContent: {
        paddingTop: 15,
        paddingBottom: 16,
    },
    itemContainerLight: {
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
    itemTitle: {
        fontSize: 18,
        color: '#000',
    },
    itemSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    containerCenter: {
        flex: 1,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    wideContent: {
        flex: 1,
        alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
        width: Platform.OS == 'web' ? '50%' : '100%'
    },
    narrowContent: {
        flex: 1,
        alignSelf: Platform.OS === 'web' ? 'center' : 'stretch',
        width: '100%'
    },
    logoutButton: {
        marginTop: 24,
        marginBottom: 24,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
        alignItems: 'center'
    },
    logoutButtonText: {
        fontWeight: 'bold',
        textDecorationLine: 'underline'
    },
    itemHighlighted: {
        borderWidth: 2,
        borderColor: 'green',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    settingTextContainer: {
        flex: 1,
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        color: '#000',
    },
    settingSubtitle: {
        fontSize: 13,
        color: '#666',
    },
    settingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    settingButtonText: {
        fontSize: 16,
        color: '#000',
        marginLeft: 10,
    },
    dangerText: {
        color: '#b00020',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        width: 300,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalText: {
        fontSize: 18,
        marginBottom: 15,
    },
    input: {
        height: 40,
        width: '100%',
        borderColor: '#ccc',
        borderWidth: 1,
        marginBottom: 12,
        paddingHorizontal: 10,
        color: '#000',
    },
    errorText: {
        color: 'red',
        marginBottom: 10,
    },
    emailInput: {
        height: 40,
        borderColor: '#000',
        borderWidth: 1,
        marginTop: 2,
        paddingHorizontal: 8,
        color: 'darkslategrey',
        backgroundColor: 'lightgray'
    }
});
