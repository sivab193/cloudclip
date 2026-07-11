import { Platform } from 'react-native';

/** Public web-app origin, used to build share links. */
export const getWebUrl = (): string => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.location.origin;
    }
    return process.env.EXPO_PUBLIC_WEB_URL || 'https://cc.siv19.dev';
};

export const truncateContent = (content: string, startLength = 15, endLength = 15) => {
    if (content.length <= startLength + endLength) {
        return content; // No need to truncate if content is short enough
    }
    const start = content.slice(0, startLength);
    const end = content.slice(-endLength);
    return `${start} _ ${end}`;
};
