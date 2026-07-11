import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

interface ButtonConfig {
    label: string;
    onPress: () => void;
    style?: object;
}

interface ConfirmationProps {
    message: string;
    subtitle: string;
    visible: boolean;
    buttons: ButtonConfig[];
}

const Confirmation: React.FC<ConfirmationProps> = ({ message, subtitle, visible, buttons }) => {
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
                        {buttons.map((button, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.button, button.style]}
                                onPress={button.onPress}
                            >
                                <Text style={styles.buttonText}>{button.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        width: '80%',
        maxWidth: 400,
    },
    message: {
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
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
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
});

export default Confirmation;
