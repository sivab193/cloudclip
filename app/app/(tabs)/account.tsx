import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, SafeAreaView, FlatList, Platform, Modal, TouchableWithoutFeedback, ScrollView, Dimensions } from 'react-native';
import { useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/auth/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { apiService } from '@/service/apiService';
import { getDeviceOS, removeDeviceId, setDeviceId } from '@/service/deviceService';
import { Device } from '@/service/models';
import Header from '@/components/Header';
import { useNavigation } from '@react-navigation/native';
import Alert from '@/components/Alert';
import Confirmation from '@/components/Confirmation';
import useDeviceDetails from '@/hooks/useDeviceDetails';
import NoItemsComponent from '@/components/NoItems';

export default function Account() {
    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const { width: screenWidth } = Dimensions.get('window');
    const isWeb = Platform.OS === 'web';
    const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
    const isWebPhone = isWeb && screenWidth < 768;
    const [name, setName] = useState('');
    const [devices, setDevices] = useState<Device[]>([]); // Define the type for the state
    const [modalVisible, setModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const [formDeviceName, setFormDeviceName] = useState('');
    const [isWideScreen, setIsWideScreen] = useState(Dimensions.get('window').width >= 768);


    const authContext = useAuth();
    if (!authContext) {
        throw new Error("AuthContext must be used within an AuthProvider");
    }
    const { user, logout } = authContext; // Use AuthContext to get the user
    const email = user?.email || 'user@example.com';
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [deviceIDToRemove, setDeviceIDToRemove] = useState("");
    const { deviceId, deviceName } = useDeviceDetails();

    const showConfirmation = (item: Device) => {
        setDeviceIDToRemove(item.id || '');
        setConfirmationVisible(true);
    };

    const handleCancel = () => {
        setConfirmationVisible(false);
    };

    const showAlert = (message: string) => {
        setAlertVisible(true);
        setAlertMessage(message);
        setTimeout(() => setAlertVisible(false), 3000);
    };

    const setAndHighlight = async (devices: Device[]) => {
        setDevices(devices);
        const matchingIndex = deviceName ? devices.findIndex(device => device.deviceId?.includes(deviceId)) : -1;
        setHighlightIndex(matchingIndex);
    };

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', () => {
            setIsWideScreen(Dimensions.get('window').width >= 768);
        });

        let unsubscribe: (() => void) | undefined;

        const initialize = async () => {
            try {
                if (user) {
                    // Sync user with backend on every visit to account tab
                    const userData = await apiService.syncUser(user.email || '', user.displayName || 'User');
                    if (userData) {
                        setName(userData.name);
                    }
                }
                if (user && deviceId) {
                    const fetchedDevices = await apiService.getDevices();
                    setAndHighlight(fetchedDevices);
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        };
        initialize();

        return () => {
            subscription.remove();
            if (unsubscribe) unsubscribe();
        };
    }, [user, deviceId]);

    const handleSave = async () => {
        if (user) {
            try {
                await apiService.syncUser(user.email || '', name);
                showAlert("Account information saved!");
            } catch (error) {
                showAlert("Failed to save account information");
            }
        } else
            showAlert("An error occured while saving the information");
    };

    const handleOpen = () => {
        setModalVisible(true);
    };

    const handleAddDevice = async () => {
        if (formDeviceName.length < 5) {
            setErrorMessage('Device name must be at least 5 characters long.');
            return;
        }
        if (deviceId && user) {
            const newDeviceId = deviceId + '_*_' + formDeviceName;
            const deviceOS = getDeviceOS();
            try {
                await apiService.registerDevice(newDeviceId, formDeviceName, deviceOS);
                setDeviceId(newDeviceId);
                setModalVisible(false);
                setFormDeviceName('');
                setErrorMessage('');
                
                // Refresh devices list
                const fetchedDevices = await apiService.getDevices();
                setAndHighlight(fetchedDevices);
                showAlert("Device added successfully!");
            } catch (error) {
                setErrorMessage('Failed to add device.');
            }
        }
    };

    const handleSync = async (index: number) => {
        // Toggle sync is not yet implemented in backend REST API based on my route creation
        // but we can add it or just show a message. For now I'll skip implementation to avoid crashes
        showAlert("Sync toggle coming soon!");
    };

    const handleRemove = async () => {
        setConfirmationVisible(false);
        try {
            // Find the deviceId for this index
            const deviceToRemove = devices.find(d => (d._id || d.id) === deviceIDToRemove);
            if (deviceToRemove) {
                await apiService.deleteDevice(deviceToRemove.deviceId);
                setDevices(prev => prev.filter(d => (d._id || d.id) !== deviceIDToRemove));
                if (deviceToRemove.deviceId === deviceId) {
                    removeDeviceId(deviceId);
                }
                showAlert("Device removed successfully.");
            }
        } catch (error) {
            showAlert("Failed to remove device.");
        }
    };

    const handleLogout = () => {
        logout(); // Call the logout function from useAuth
    };

    const renderItem = ({ item, index }: { item: Device, index: number }) => {
        return (
            <View style={[
                highlightIndex === index ? styles.itemHighlighted : null,
                styles.itemContainerLight
            ]}>
                {/* <View style={styles.container}> */}
                <View style={styles.textContainer}>
                    <Text style={isDarkMode ? styles.itemTitleDark : styles.itemTitleLight}>{item.deviceName}</Text>
                    <Text style={isDarkMode ? styles.itemExpiryDark : styles.itemExpiryLight}>Type: {item.os}</Text>
                </View>
                <View style={styles.iconsContainer}>
                    <TouchableOpacity onPress={() => handleSync(index)} style={styles.iconButton}>
                        <Ionicons
                            name={item.sync ? "sync-circle" : "sync-outline"}
                            size={24}
                            color={item.sync ? 'green' : 'black'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => showConfirmation(item)} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={24} color={'black'} />
                    </TouchableOpacity>
                </View>
                {/* </View> */}
            </View>
        );
    };

    const handleCloseModal = () => {
        setModalVisible(false);
    };

    const navigation = useNavigation();
    return (
        <>
            <Alert message={alertMessage} visible={alertVisible} />
            <Confirmation
                message="Are you sure you want to proceed?"
                visible={confirmationVisible}
                buttons={[
                    { label: 'No', onPress: handleCancel, style: { backgroundColor: 'black' } },
                    { label: 'Yes', onPress: handleRemove, style: { backgroundColor: 'black' } },
                ]}
                subtitle={''} />
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false} // Optional: hides the vertical scrollbar
                horizontal={false} // Ensures horizontal scrolling is disabled
            >
                <SafeAreaView style={styles.safeArea}>
                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <TouchableWithoutFeedback onPress={handleCloseModal}>

                            <View style={styles.modalContainer}>
                                <TouchableWithoutFeedback>
                                    <View style={styles.modalView}>
                                        <Text style={styles.modalText}>Device Name: </Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formDeviceName}
                                            onChangeText={setFormDeviceName}
                                        />
                                        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
                                        <TouchableOpacity
                                            style={isDarkMode ? styles.buttonDark : styles.buttonLight}
                                            onPress={handleAddDevice}
                                        >
                                            <Text style={isDarkMode ? styles.buttonTextDark : styles.buttonTextLight}>Add Device</Text>
                                        </TouchableOpacity>
                                    </View>
                                </TouchableWithoutFeedback>
                            </View>
                        </TouchableWithoutFeedback>
                    </Modal>
                    <Header navigation={navigation} />
                    <ThemedView style={isDarkMode ? styles.containerDark : styles.containerLight}>
                        {user ? (
                            <View style={isWideScreen ? styles.wideContent : styles.narrowContent}>
                                <ThemedText type="subtitle" style={[{ color: 'black' }]}>Your Account</ThemedText>
                                <Text>{'\n'}</Text>
                                <View style={styles.fieldContainer}>
                                    <ThemedText type="subtitle" style={styles.text}>Email</ThemedText>
                                    <TextInput
                                        style={styles.emailInput}
                                        value={email}
                                        editable={false}
                                        placeholderTextColor={isDarkMode ? '#999' : '#999'}
                                    />
                                </View>
                                <View style={styles.fieldContainer}>
                                    <ThemedText type="subtitle" style={styles.text}>Name</ThemedText>
                                    <TextInput
                                        style={isDarkMode ? styles.inputDark : styles.inputLight}
                                        onChangeText={setName}
                                        value={name}
                                        placeholder="Enter your name"
                                        placeholderTextColor={'slategrey'}
                                    />
                                </View>
                                <TouchableOpacity
                                    style={isDarkMode ? styles.buttonDark : styles.buttonLight}
                                    onPress={handleSave}
                                >
                                    <Text style={isDarkMode ? styles.buttonTextDark : styles.buttonTextLight}>Save</Text>
                                </TouchableOpacity>
                                <Text>{'\n'}</Text>
                                <ThemedView style={isDarkMode ? styles.containerDark : styles.containerLight}>
                                    <ThemedText type="subtitle" style={styles.text}>My Devices</ThemedText>
                                    {/* <Text>{'\n'}</Text> */}
                                    {devices.length > 0 ? (
                                        <FlatList
                                            data={devices}
                                            keyExtractor={(item) => item.deviceId || ''}
                                            renderItem={renderItem}
                                            contentContainerStyle={styles.listContent}
                                        />) : (
                                        <NoItemsComponent></NoItemsComponent>
                                    )}
                                    <TouchableOpacity
                                        style={[
                                            styles.addDeviceButton,
                                            (highlightIndex !== -1) && styles.buttonDisabled // Apply disabled style if the button is disabled
                                        ]}
                                        onPress={handleOpen}
                                        disabled={(highlightIndex !== -1)} // Disable the button if needed
                                    >
                                        <Text style={styles.addDeviceButtonText}>
                                            Add Current Device
                                        </Text>
                                    </TouchableOpacity>
                                </ThemedView>
                                <TouchableOpacity
                                    style={styles.logoutButton}
                                    onPress={handleLogout}
                                >
                                    <Text style={styles.logoutButtonText}>Click here to logout!</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <ThemedView style={styles.containerCenter}>
                                <MaterialCommunityIcons name="hand-wave" size={24} color="black" />
                                <ThemedText type="subtitle" style={styles.textLight}>Hi there! {'\n'}</ThemedText>
                                <ThemedText type="subtitle" style={styles.textLight}>Welcome! Please log in to access your account and enjoy personalized features.
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
        marginLeft: 10, // Add spacing between icons
    },
    text: {
        fontSize: 16,
        color: '#000',
    },
    textContainer: {
        flex: 1, // Takes up remaining space
    },
    containerLight: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
    },
    containerDark: {
        flex: 1,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
    },
    fieldContainer: {
        marginBottom: 16,
    },
    textLight: {
        fontSize: 16,
        color: '#000',
    },
    textDark: {
        fontSize: 16,
        color: '#000',
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
    inputDark: {
        height: 40,
        borderColor: '#000',
        borderWidth: 1,
        marginTop: 2,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
        color: '#000',
    },
    buttonLight: {
        marginTop: 24,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#000',
        alignItems: 'center',
        minWidth: 100
    },
    buttonDark: {
        marginTop: 24,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#000',
        alignItems: 'center',
        minWidth: 100
    },
    buttonTextLight: {
        color: '#fff',
        fontSize: 16,
    },
    buttonTextDark: {
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
    itemContainerDark: {
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
    itemTitleLight: {
        fontSize: 18,
        color: '#000',
    },
    itemTitleDark: {
        fontSize: 18,
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
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
        alignItems: 'center'
    },
    logoutButtonText: {
        fontWeight: 'bold',
        textDecorationColor: 'black',
        textDecorationStyle: 'solid',
        textDecorationLine: 'underline'
    },
    itemHighlighted: {
        backgroundColor: 'rgba(255, 215, 0, 0.3)', // Light yellow with transparency
        borderRadius: 5, // Rounded corners
        padding: 10, // Padding inside the item
        borderWidth: 2, // Border width
        borderColor: 'green', // Border color
        // Optionally, add shadow for better visibility
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonDisabled: {
        backgroundColor: 'grey', // Disabled button color
        opacity: 0.5, // Reduced opacity to indicate disabled state
    },
    addDeviceButton: {
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBlockColor: '#000',
        borderWidth: 2,
        borderStyle: 'solid',
        borderRadius: 0
    },
    addDeviceButtonText: {
        color: 'black',
        fontWeight: 'bold'
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
        alignItems: 'center',
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
        marginBottom: 20,
        paddingHorizontal: 10,
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