import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

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
}

const Confirmation: React.FC<ConfirmationProps> = ({ message, subtitle, visible, buttons }) => {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={() => {
                // Handle back button on Android, consider passing an onCancel function if needed
                if (buttons.find(button => button.label === 'Cancel')) {
                    buttons.find(button => button.label === 'Cancel')?.onPress();
                }
            }}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.message}>{message}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                    <View style={styles.buttonsContainer}>
                        {buttons.map((button, index) => {
                            const danger = button.variant === 'danger';
                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[styles.button, danger && styles.buttonDanger]}
                                    onPress={button.onPress}
                                >
                                    <Text style={[styles.buttonText, { color: danger ? t.onDanger : t.onPrimary }]}>
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
        backgroundColor: t.surface,
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    message: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
        color: t.text,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
        color: t.textMuted,
    },
    buttonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 5,
        alignItems: 'center',
        backgroundColor: t.primary,
    },
    buttonDanger: {
        backgroundColor: t.danger,
    },
    buttonText: {
        fontSize: 16,
    },
});

export default Confirmation;
