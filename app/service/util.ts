import { Platform } from 'react-native';


export const getDomain = () => {
    if (Platform.OS === 'web') {
        return window.location.origin; // Returns the domain in a web environment
    } else {
        return "https://cloud-clip.vercel.app/" // Returns the domain in a React Native environment
    }
};

export const truncateContent = (content: string, startLength = 15, endLength = 15) => {
    if (content.length <= startLength + endLength) {
        return content; // No need to truncate if content is short enough
    }
    const start = content.slice(0, startLength);
    const end = content.slice(-endLength);
    return `${start} _ ${end}`;
};