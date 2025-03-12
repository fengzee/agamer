const { exec } = require('child_process');
const { promisify } = require('util');
const Shell = require('./shell');
const execAsync = promisify(exec);

class DeviceManager {
  constructor() {
    this.shells = new Map(); // 存储设备对应的 shell 实例
  }

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

  // 获取设备的 shell 实例
  async getShell(deviceSerial) {
    if (!this.shells.has(deviceSerial)) {
      const shell = new Shell();
      shell.init();
      this.shells.set(deviceSerial, shell);
    }
    return this.shells.get(deviceSerial);
  }

  // 点击操作
  async tap(deviceSerial, x, y) {
    const shell = await this.getShell(deviceSerial);
    return shell.tap(x, y);
  }

  // 发送键盘事件
  async sendKeyEvent(deviceSerial, keycode) {
    const shell = await this.getShell(deviceSerial);
    return shell.sendKeyEvent(keycode);
  }
}

module.exports = DeviceManager; 