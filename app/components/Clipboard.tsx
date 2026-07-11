import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Text, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { CustomClipboard } from '@/service/models';
import { apiService } from '@/service/apiService';
import { socketService } from '@/service/socketService';
import { truncateContent } from '@/service/util';
import { useAuth } from '@/auth/AuthContext';
import NoItemsComponent from './NoItems';
import Confirmation from './Confirmation';
import { generateNanoID, getSharedLinkURL } from '@/service/shareService';
import * as Clipboard from 'expo-clipboard';


interface ClipboardScreenProps {
    clipboardEntries: CustomClipboard[];
    showAlert: (message: string) => void
}

const ClipboardScreen: React.FC<ClipboardScreenProps> = ({ clipboardEntries, showAlert }) => {

    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [shareConfirmationVisible, setShareConfirmationVisible] = useState(false);
    const [itemToRemove, setItemToRemove] = useState("");
    const [itemToShare, setItemToShare] = useState("");
    const [sharedLink, setSharedLink] = useState<string | null>(null);
    const [sharedCode, setSharedCode] = useState<string | null>(null);


    const handleDelete = (id: string) => {
        socketService.deleteClipboard(id);
        showAlert('Deleted clipboard entry');
    };

    const handleClickEntry = async (id: string) => {
        // Timestamp update handled via backend if needed, or just copy to clipboard
    }
    const { user } = useAuth(); // Use AuthContext to get the user

    const showConfirmation = (itemId: string) => {
        setConfirmationVisible(true);
        setItemToRemove(itemId);
    }

    const handleCancel = () => {
        setConfirmationVisible(false);
    };

    const handleShareCancel = () => {
        setShareConfirmationVisible(false);
    };

    const handleRemove = () => {
        setConfirmationVisible(false);
        handleDelete(itemToRemove);
    };

    const handleShareConfirmation = async (content: string) => {
        const code: string = generateNanoID();
        const generatedLink = getSharedLinkURL(code);
        setSharedCode(code);
        setSharedLink(generatedLink);
        setShareConfirmationVisible(true);
        setItemToShare(content);
    };

    const handleCopyLink = async () => {
        if (itemToShare && sharedLink) {
            try {
                await apiService.createSharedLink(itemToShare);
                Clipboard.setStringAsync(sharedLink);
                setShareConfirmationVisible(false);
                showAlert("Link copied to clipboard!");
            } catch (error) {
                showAlert("Failed to create shared link.");
            }
        } else {
            showAlert("An unexpected error occured!");
        }
    };

    const handleCopyCode = async () => {
        if (itemToShare && sharedCode) {
            try {
                await apiService.createSharedLink(itemToShare);
                Clipboard.setStringAsync(sharedCode);
                setShareConfirmationVisible(false);
                showAlert("Code copied to clipboard!");
            } catch (error) {
                showAlert("Failed to create shared link.");
            }
        } else {
            showAlert("An unexpected error occured!");
        }
    };


    return (
        <>
            <Confirmation
                message="Are you sure you want to proceed?"
                visible={confirmationVisible}
                buttons={[
                    { label: 'No', onPress: handleCancel, style: { backgroundColor: 'black' } },
                    { label: 'Yes', onPress: handleRemove, style: { backgroundColor: 'black' } },
                ]}
                subtitle={''} />
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

            <ThemedView style={styles.container}>
                {clipboardEntries.length > 0 ? (
                    <ScrollView contentContainerStyle={styles.scrollContainer}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}>
                        {clipboardEntries.map((entry, index) => (
                            <TouchableOpacity
                                onPress={() => handleClickEntry(entry._id || entry.id || '')}
                                key={entry._id || entry.id}
                            >
                                <View style={styles.entryContainer}>
                                    <View style={styles.textContainer}>
                                        <ThemedText type='default' style={styles.clipboardText}>
                                            {truncateContent(entry.content)}
                                        </ThemedText>
                                        <ThemedText type='default' style={styles.clipboardDevice}>
                                            Content Length: {entry.content.length}
                                        </ThemedText>
                                        <ThemedText type='default' style={styles.clipboardDevice}>
                                            Device: {entry.deviceName || 'Unknown Device'}
                                        </ThemedText>
                                    </View>
                                    <View style={styles.iconContainer}>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => showConfirmation(entry._id || entry.id || '')}
                                        >
                                            <Ionicons name="trash-outline" size={20} color={'black'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => handleShareConfirmation(entry.content)}
                                        >
                                            <Ionicons name="share-social-outline" size={20} color={'black'} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                ) : (
                    <NoItemsComponent></NoItemsComponent>
                )}
            </ThemedView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        marginTop: 16,
        // borderColor: 'black',
        // borderWidth: 1,
        height: 300,
        // padding: 10,
    },
    scrollContainer: {
        padding: 0,
    },
    entryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#f0f0f0',
        shadowOffset: { height: 2, width: 2 },
        shadowColor: '#000',
        shadowOpacity: 0.1,
        gap: 10,
        cursor: Platform.OS === 'web' ? 'pointer' : 'auto'
    },
    clipboardText: {
        fontSize: 14,
        lineHeight: 16,
        flex: 1,
        color: '#000',
        fontWeight: 500
    },
    clipboardDevice: {
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
        color: 'darkslategrey'
    },
    copyButton: {
        marginLeft: 10,
    },
    textContainer: {
        flex: 1, // Ensure text takes up remaining space
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 10,
    },
});

export default ClipboardScreen;
