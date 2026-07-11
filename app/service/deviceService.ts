import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'deviceId';

const isNative = Platform.OS === 'android' || Platform.OS === 'ios';

const getAppDeviceId = async (): Promise<string> => {
    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;
    const fresh = Crypto.randomUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
    return fresh;
};

const getWebDeviceId = async (): Promise<string> => {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const fresh = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
    return fresh;
};

export const getDeviceId = async (): Promise<string | null> => {
    try {
        return isNative ? await getAppDeviceId() : await getWebDeviceId();
    } catch (error) {
        console.error('Error getting device ID:', error);
        return null;
    }
};

export const removeDeviceId = async (deviceId: string): Promise<void> => {
    try {
        const existing = await getDeviceId();
        if (existing === deviceId) {
            if (isNative) {
                await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
            } else {
                await AsyncStorage.removeItem(DEVICE_ID_KEY);
            }
        }
    } catch (error) {
        console.error('Error removing device ID:', error);
    }
};

export const getDeviceOS = (): string => {
    return Platform.OS;
};
