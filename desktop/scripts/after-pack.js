const { execFileSync } = require('node:child_process');
const path = require('node:path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const plist = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Info.plist');
  const buddy = '/usr/libexec/PlistBuddy';
  const remove = (key) => {
    try { execFileSync(buddy, ['-c', `Delete :${key}`, plist]); } catch { /* absent is already safe */ }
  };
  for (const key of [
    'NSAudioCaptureUsageDescription',
    'NSBluetoothAlwaysUsageDescription',
    'NSBluetoothPeripheralUsageDescription',
    'NSCameraUsageDescription',
    'NSMicrophoneUsageDescription',
    'NSAppTransportSecurity',
  ]) remove(key);
  execFileSync(buddy, ['-c', 'Add :NSAppTransportSecurity dict', plist]);
  execFileSync(buddy, ['-c', 'Add :NSAppTransportSecurity:NSAllowsArbitraryLoads bool false', plist]);
};
