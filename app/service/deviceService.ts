import { Platform } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';

const getAppDeviceId = async (): Promise<string> => {
    try {
        let deviceId = await SecureStore.getItemAsync('deviceId');
        if (!deviceId) {
            deviceId = Crypto.randomUUID();
            await SecureStore.setItemAsync('deviceId', deviceId);
        }
        return deviceId;
    } catch (error) {
        console.error('Error getting app device ID:', error);
        throw error;
    }
};

const getWebDeviceId = async (): Promise<string> => {
    try {
        let deviceId = await AsyncStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = String(Device.totalMemory);
        }
        return deviceId;
    } catch (error) {
        console.error('Error getting web device ID:', error);
        throw error; // Optionally, rethrow the error if you want to propagate it
    }
};

export const getDeviceId = async (): Promise<string|null> => {
    try {
        let deviceId: string;
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
            deviceId = await getAppDeviceId();
            console.log('Your App Device:', deviceId);
        } else {
            deviceId = await getWebDeviceId();
            console.log('Your Web Device:', deviceId);
        }
        return deviceId;
    } catch (error) {
        console.error('Error getting device ID:', error);
    }
    return null;
};

const setAppDeviceId = async (deviceId: string): Promise<void> => {
    try {
        await SecureStore.setItemAsync('deviceId', deviceId);
    }
    catch (error) {
        console.error('Error getting app device ID:', error);
        throw error; // Optionally, rethrow the error if you want to propagate it
    }
};

const setWebDeviceId = async (deviceId: string): Promise<void> => {
    try {
        await AsyncStorage.setItem('deviceId',deviceId);
    }
    catch (error) {
        console.error('Error getting app device ID:', error);
        throw error; // Optionally, rethrow the error if you want to propagate it
    }
};


export const setDeviceId = async (deviceId: string): Promise<void> => {
    try {
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
            await setAppDeviceId(deviceId);
            console.log('App Device Id set: ', deviceId);
        } else {
            await setWebDeviceId(deviceId);
            console.log('Web Device Id set: ', deviceId);
        }
    } catch (error) {
        console.error('Error setting device ID:', error);
    }
};

const removeAppDeviceId = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync('deviceId');
        console.log('App Device Id removed');
    } catch (error) {
        console.error('Error removing app device ID:', error);
        throw error; // Optionally, rethrow the error if you want to propagate it
    }
};

const removeWebDeviceId = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem('deviceId');
        console.log('Web Device Id removed');
    } catch (error) {
        console.error('Error removing web device ID:', error);
        throw error; // Optionally, rethrow the error if you want to propagate it
    }
};

export const removeDeviceId = async (deviceId: string): Promise<void> => {
    try {
        const existing = await getDeviceId();
        console.log('existing',existing);
        console.log('tbd',deviceId);
        if(existing === deviceId){
            if (Platform.OS === 'android' || Platform.OS === 'ios') {
                await removeAppDeviceId();
            } else {
                await removeWebDeviceId();
            }
        }
    } catch (error) {
        console.error('Error removing device ID:', error);
    }
};

export const getDeviceOS = (): string => {
    return Platform.OS;
};