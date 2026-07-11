// useDeviceDetails.ts
import { useAuth } from '@/auth/AuthContext';
import { getDeviceId } from '@/service/deviceService';
import { fetchDevices } from '@/service/firebaseService';
import { useState, useEffect, useContext } from 'react';

interface DeviceDetails {
  deviceId: any;
  deviceName: any;
}

const useDeviceDetails = () => {
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails>({
    deviceId: null,
    deviceName: null
  });


  const { user } = useAuth();

  useEffect(() => {
    const fetchDeviceDetails = async () => {
      try {
        const deviceId = await getDeviceId();
        if (deviceId) {
          // Fetch devices and check deviceId here
          const devices = await fetchDevices(user?.uid || null); // Adjust according to your logic

          const foundDevice = devices.find((device) => device.deviceId?.includes(deviceId));
          if (foundDevice) {
            setDeviceDetails({
              deviceId: foundDevice.deviceId,
              deviceName: foundDevice.deviceName
            });
          } else {
            // Handle the case where device is not found
            setDeviceDetails({
              deviceId: deviceId,
              deviceName: null
            });
          }
        }
      } catch (error) {
        console.error('Error fetching device details:', error);
      }
    };

    fetchDeviceDetails();
  }, []);

  return deviceDetails;
};

export default useDeviceDetails;
