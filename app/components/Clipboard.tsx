import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Text } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DisplayClip } from '@/hooks/useClipboardSync';
import { truncateContent } from '@/service/util';
import { getMasterKey } from '@/service/keyService';
import { createShare } from '@/service/shareService';
import NoItemsComponent from './NoItems';
import Confirmation from './Confirmation';
import * as Clipboard from 'expo-clipboard';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import useAccountGuard from '@/hooks/useAccountGuard';


interface ClipboardScreenProps {
    clipboardEntries: DisplayClip[];
    showAlert: (message: string) => void
    onDelete: (id: string) => Promise<void>;
}

const ClipboardScreen: React.FC<ClipboardScreenProps> = ({ clipboardEntries, showAlert, onDelete }) => {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);

    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [shareConfirmationVisible, setShareConfirmationVisible] = useState(false);
    const [itemToRemove, setItemToRemove] = useState('');
    const [sharedLink, setSharedLink] = useState<string | null>(null);
    const [sharedCode, setSharedCode] = useState<string | null>(null);
    const { capture } = useAccountGuard();
    const sharing = useRef<(() => boolean) | null>(null);
    useEffect(() => {
        setSharedLink(null);
        setSharedCode(null);
        setConfirmationVisible(false);
        setShareConfirmationVisible(false);
    }, [capture]);

    const handleDelete = async (id: string) => {
        try {
            await onDelete(id);
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
        const valid = capture();
        if (sharing.current?.()) return;
        sharing.current = valid;
        try {
            const mk = await getMasterKey(true);
            if (!mk || !valid()) throw new Error('Unlock your data first');
            const result = await createShare(content, mk);
            if (!valid()) return;
            setSharedLink(result.url);
            setSharedCode(result.displayCode);
            setShareConfirmationVisible(true);
        } catch (error) {
            if (valid()) showAlert(error instanceof Error ? error.message : 'Failed to create shared link.');
        } finally { if (sharing.current === valid) sharing.current = null; }
    };

    const handleCopyLink = async () => {
        if (sharedLink) {
            try {
                await Clipboard.setStringAsync(sharedLink);
                setShareConfirmationVisible(false);
                showAlert('Link copied to clipboard!');
            } catch { showAlert('Could not copy to clipboard.'); }
        }
    };

    const handleCopyCode = async () => {
        if (sharedCode) {
            try {
                await Clipboard.setStringAsync(sharedCode);
                setShareConfirmationVisible(false);
                showAlert('Reference copied to clipboard!');
            } catch { showAlert('Could not copy to clipboard.'); }
        }
    };


    return (
        <>
            <Confirmation
                message="Are you sure you want to proceed?"
                visible={confirmationVisible}
                onDismiss={handleCancel}
                buttons={[
                    { label: 'No', onPress: handleCancel },
                    { label: 'Yes', onPress: handleRemove },
                ]}
                subtitle={''} />
            <Confirmation
                message={`Share link created — anyone with it can read this text for 7 days.\n`}
                subtitle={`Link: ${sharedLink || ''}\nReference: ${sharedCode || ''}`}
                visible={shareConfirmationVisible}
                onDismiss={handleShareCancel}
                buttons={[
                    { label: 'Copy Link', onPress: handleCopyLink },
                    { label: 'Copy Reference', onPress: handleCopyCode },
                    { label: 'Cancel', onPress: handleShareCancel, variant: 'danger' },
                ]}
            />

            <ThemedView style={styles.container}>
                {clipboardEntries.length > 0 ? (
                    <ScrollView contentContainerStyle={styles.scrollContainer}
                        scrollEnabled={true}
                        nestedScrollEnabled={true}>
                        {clipboardEntries.map((entry, index) => (
                            <TouchableOpacity
                                disabled={entry.unreadable}
                                onPress={() => handleClickEntry(entry.content)}
                                key={entry._id || entry.id}
                            >
                                <View style={styles.entryContainer}>
                                    <View style={styles.entryIcon}>
                                        <Text style={styles.entryIndex}>{String(index + 1).padStart(2, '0')}</Text>
                                    </View>
                                    <View style={styles.textContainer}>
                                        <ThemedText type='default' style={styles.clipboardText}>
                                            {truncateContent(entry.content)}
                                        </ThemedText>
                                        <ThemedText type='default' style={styles.clipboardDevice}>
                                            {entry.content.length} characters · {entry.deviceName || 'Unknown device'}
                                        </ThemedText>
                                    </View>
                                    <View style={styles.iconContainer}>
                                        <TouchableOpacity
                                            style={styles.iconButton}
                                            onPress={() => showConfirmation(entry._id || entry.id || '')}
                                        >
                                            <Ionicons name="trash-outline" size={17} color={t.textMuted} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            disabled={entry.unreadable}
                                            style={styles.iconButton}
                                            onPress={() => handleShareConfirmation(entry.content)}
                                        >
                                            <Ionicons name="share-social-outline" size={17} color={t.primary} />
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

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        marginTop: 20,
        height: 300,
    },
    scrollContainer: {
        padding: 0,
    },
    entryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        padding: 14,
        borderRadius: 16,
        backgroundColor: t.surfaceAlt,
        borderWidth: 1,
        borderColor: t.borderSubtle,
        shadowOffset: { height: 2, width: 2 },
        shadowColor: t.shadow,
        shadowOpacity: 0.025,
        gap: 12,
        cursor: Platform.OS === 'web' ? 'pointer' : 'auto'
    },
    clipboardText: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
        color: t.text,
        fontWeight: '500'
    },
    clipboardDevice: {
        fontSize: 12,
        lineHeight: 22,
        flex: 1,
        color: t.textMuted
    },
    textContainer: {
        flex: 1,
    },
    entryIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.primarySoft },
    entryIndex: { color: t.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 7,
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.borderSubtle,
    },
});

export default ClipboardScreen;
