import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { CustomClipboard } from '@/service/models';
import { socketService } from '@/service/socketService';
import { truncateContent } from '@/service/util';
import { getMasterKey } from '@/service/keyService';
import { createShare } from '@/service/shareService';
import NoItemsComponent from './NoItems';
import Confirmation from './Confirmation';
import * as Clipboard from 'expo-clipboard';


interface ClipboardScreenProps {
    clipboardEntries: CustomClipboard[];
    showAlert: (message: string) => void
}

const ClipboardScreen: React.FC<ClipboardScreenProps> = ({ clipboardEntries, showAlert }) => {

    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [shareConfirmationVisible, setShareConfirmationVisible] = useState(false);
    const [itemToRemove, setItemToRemove] = useState('');
    const [sharedLink, setSharedLink] = useState<string | null>(null);
    const [sharedCode, setSharedCode] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        try {
            await socketService.deleteClipboard(id);
            showAlert('Deleted clipboard entry');
        } catch {
            showAlert('Failed to delete entry');
        }
    };

    // Tap an entry to copy it to this device's clipboard.
    const handleClickEntry = async (content: string) => {
        try {
            await Clipboard.setStringAsync(content);
            showAlert('Copied to clipboard');
        } catch {
            showAlert('Could not copy to clipboard');
        }
    };

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

    // Creates the shared link ONCE, then the dialog buttons only copy.
    const handleShareConfirmation = async (content: string) => {
        const mk = await getMasterKey();
        if (!mk) {
            showAlert('Unlock your data first');
            return;
        }
        try {
            const result = await createShare(content, mk);
            setSharedLink(result.url);
            setSharedCode(result.displayCode);
            setShareConfirmationVisible(true);
        } catch {
            showAlert('Failed to create shared link.');
        }
    };

    const handleCopyLink = async () => {
        if (sharedLink) {
            await Clipboard.setStringAsync(sharedLink);
            setShareConfirmationVisible(false);
            showAlert('Link copied to clipboard!');
        }
    };

    const handleCopyCode = async () => {
        if (sharedCode) {
            await Clipboard.setStringAsync(sharedCode);
            setShareConfirmationVisible(false);
            showAlert('Code copied to clipboard!');
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
                message={`Share link created — anyone with it can read this text for 7 days.\n`}
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
                        {clipboardEntries.map((entry) => (
                            <TouchableOpacity
                                onPress={() => handleClickEntry(entry.content)}
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
        height: 300,
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
        fontWeight: '500'
    },
    clipboardDevice: {
        fontSize: 12,
        lineHeight: 16,
        flex: 1,
        color: 'darkslategrey'
    },
    textContainer: {
        flex: 1,
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
