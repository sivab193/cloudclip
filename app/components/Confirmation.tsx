import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';
import Ionicons from '@expo/vector-icons/Ionicons';

interface ButtonConfig {
    label: string;
    onPress: () => void;
    /** 'danger' tints the button for destructive actions. Defaults to 'default'. */
    variant?: 'default' | 'danger';
}

interface ConfirmationProps {
    message: string;
    subtitle: string;
    visible: boolean;
    buttons: ButtonConfig[];
    onDismiss: () => void;
}

const Confirmation: React.FC<ConfirmationProps> = ({ message, subtitle, visible, buttons, onDismiss }) => {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.icon}><Ionicons name="sparkles-outline" size={22} color={t.primary} /></View>
                    <Text style={styles.message}>{message}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                    <View style={styles.buttonsContainer}>
                        {buttons.map((button, index) => {
                            const danger = button.variant === 'danger';
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.button, index < buttons.length - 1 && !danger && styles.buttonSecondary, danger && styles.buttonDanger]}
                                    onPress={button.onPress}
                                >
                                    <Text style={[styles.buttonText, { color: danger ? t.onDanger : index < buttons.length - 1 ? t.text : t.onPrimary }]}>
                                        {button.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: t.overlay,
    },
    container: {
        backgroundColor: t.glass,
        borderRadius: 28,
        padding: 28,
        width: '90%',
        maxWidth: 440,
        borderWidth: 1,
        borderColor: t.border,
        shadowColor: t.primaryStrong,
        shadowOpacity: 0.2,
        shadowRadius: 45,
        shadowOffset: { width: 0, height: 20 },
    },
    icon: { width: 46, height: 46, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: t.primarySoft, marginBottom: 17 },
    message: {
        fontSize: 21,
        lineHeight: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
        marginBottom: 10,
        textAlign: 'center',
        color: t.text,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        marginBottom: 24,
        textAlign: 'center',
        color: t.textMuted,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        minHeight: 48,
        padding: 12,
        borderRadius: 14,
        marginHorizontal: 5,
        alignItems: 'center',
        backgroundColor: t.primaryStrong,
    },
    buttonSecondary: { backgroundColor: t.surfaceAlt, borderWidth: 1, borderColor: t.borderSubtle },
    buttonDanger: {
        backgroundColor: t.danger,
    },
    buttonText: {
        fontSize: 16,
    },
});

export default Confirmation;
