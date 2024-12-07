const { contextBridge } = require('electron');
const { DeviceManager, Screencap } = require('fadb');

// 创建实例
const deviceManager = new DeviceManager();
const screencap = new Screencap();

contextBridge.exposeInMainWorld('electronAPI', {
  deviceManager: {
    getDevices: () => deviceManager.getDevices(),
    setDevice: (serial) => deviceManager.setDevice(serial)
  },
  screencap: {
    capture: () => screencap.capture()
  }
}); 
