const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DeviceManager {
  async getDevices() {
    try {
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.split('\n').slice(1); // 跳过第一行 "List of devices attached"
      
      return lines
        .map(line => {
          const [serial, status] = line.trim().split('\t');
          if (serial && status) {
            return { serial, status };
          }
          return null;
        })
        .filter(device => device !== null);
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  async setDevice(serial) {
    if (!serial) return false;
    try {
      await execAsync(`adb -s ${serial} get-state`);
      return true;
    } catch (error) {
      console.error('Failed to set device:', error);
      return false;
    }
  }
}

module.exports = DeviceManager; 