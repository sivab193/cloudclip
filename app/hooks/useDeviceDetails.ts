import { useAuth } from '@/auth/AuthContext';
import { getDeviceId, getDeviceOS } from '@/service/deviceService';
import { apiService } from '@/service/apiService';
import * as Device from 'expo-device';
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { auth } from '@/firebaseConfig';

interface DeviceDetails {
  deviceId: string | null;
  deviceName: string | null;
}

const defaultDeviceName = (): string => {
  if (Platform.OS === 'web') return 'Web browser';
  return Device.deviceName ?? Device.modelName ?? 'My device';
};

/**
 * Resolves this device's stable ID and display name, registering it with the
 * backend on first use for the signed-in user.
 */
const useDeviceDetails = (): DeviceDetails => {
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails>({
    deviceId: null,
    deviceName: null
  });

  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const fetchDeviceDetails = async () => {
      setDeviceDetails({ deviceId: null, deviceName: null });
      if (!user) return;
      try {
        const deviceId = await getDeviceId();
        if (!deviceId || cancelled || auth.currentUser !== user) return;
        let deviceName = defaultDeviceName();
        try {
          const devices = await apiService.getDevices();
          if (cancelled || auth.currentUser !== user) return;
          const found = devices.find((device) => device.deviceId === deviceId);
          if (found) {
            deviceName = found.deviceName;
          } else {
            await apiService.registerDevice(deviceId, deviceName, getDeviceOS());
          }
        } catch {
          // Offline or backend down — still expose the local ID/name.
        }
        if (!cancelled && auth.currentUser === user) setDeviceDetails({ deviceId, deviceName });
      } catch { /* Local storage is unavailable; manual actions report the error. */ }
    };

    fetchDeviceDetails();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return deviceDetails;
};

export default useDeviceDetails;
