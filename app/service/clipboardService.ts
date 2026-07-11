import * as Clipboard from 'expo-clipboard';

/**
 * Sets the provided text to the clipboard.
 */
export const setClipboard = async (text: string | null, showAlert: (message: string) => void, alertMessage: string): Promise<void> => {
    if (text) {
        try {
            await Clipboard.setStringAsync(text);
            showAlert(alertMessage);
        } catch (error) {
            showAlert('An unexpected error occurred');
            throw error;
        }
    }
};

/**
 * Gets the current text from the clipboard.
 */
export const getClipboard = async (): Promise<string> => {
    return Clipboard.getStringAsync();
};
