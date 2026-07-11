import { setClipboard } from "./clipboardService";
import { apiService } from "./apiService";
import { socketService } from "./socketService";
import { getDomain } from "./util";
import { customAlphabet } from 'nanoid/non-secure'; 

export const getSharedLinkURL = (code: string): string => {
    console.log(code);
    const sharedLinkURL = `${getDomain()}/shared/${code}`;
    console.log(sharedLinkURL);
    return sharedLinkURL;
}

export const handleShare = async (content: string, user: any, deviceId: string, deviceName: string, showAlert: (message: string) => void, setTextToShare?: (text: string) => void) => {
    if (content) {
        try {
            console.log(user, deviceId, deviceName);
            const code: string = generateNanoID();
            
            if (user) {
                // Emit to socket for real-time history update on other devices
                socketService.createClipboard(deviceId, deviceName, content);
            }
            
            // Create shared link via REST
            await apiService.createSharedLink(content, code);
            
            const sharedLinkURL = getSharedLinkURL(code);
            await setClipboard(sharedLinkURL, showAlert, "Shared link created and copied to clipboard.");
            if (setTextToShare) setTextToShare('');
        }
        catch (error) {
            console.error('Error creating shared link: ', error);
            showAlert("Failed to create shared link.");
        }
    }
    else {
        showAlert("Please enter text to share");
    }
};

export const handleShareFromClipboard = async (content: string, showAlert: (message: string) => void) => {
    if (content) {
        try {
            const code: string = generateNanoID();
            await apiService.createSharedLink(content, code);
            const sharedLinkURL = getSharedLinkURL(code);
            await setClipboard(sharedLinkURL, showAlert, "Shared link created and copied to clipboard.");
        } catch (error) {
            console.error('Error creating shared link from clipboard: ', error);
            showAlert("Failed to create shared link.");
        }
    } else {
        showAlert("Please enter text to share");
    }
};

export function generateNanoID() {
    const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nanoid = customAlphabet(alphabet, 5);
    return nanoid(); 
}