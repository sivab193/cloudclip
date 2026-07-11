import * as SecureStore from 'expo-secure-store';

// Native master-key storage: OS keychain/keystore via SecureStore.
// The web variant (keyStore.web.ts) deliberately uses sessionStorage instead.

const MASTER_KEY = 'cc.masterKey';

export const saveMasterKey = async (keyB64: string): Promise<void> => {
    await SecureStore.setItemAsync(MASTER_KEY, keyB64);
};

export const getStoredMasterKey = async (): Promise<string | null> => {
    return SecureStore.getItemAsync(MASTER_KEY);
};

export const clearMasterKey = async (): Promise<void> => {
    await SecureStore.deleteItemAsync(MASTER_KEY);
};
