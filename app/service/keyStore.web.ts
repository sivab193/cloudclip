// Web master-key storage: sessionStorage only — cleared when the tab closes,
// never written to localStorage where an XSS could exfiltrate it persistently.
// Users re-enter their password per browser session.

const MASTER_KEY = 'cc.masterKey';

export const saveMasterKey = async (keyB64: string): Promise<void> => {
    sessionStorage.setItem(MASTER_KEY, keyB64);
};

export const getStoredMasterKey = async (): Promise<string | null> => {
    return sessionStorage.getItem(MASTER_KEY);
};

export const clearMasterKey = async (): Promise<void> => {
    sessionStorage.removeItem(MASTER_KEY);
};
