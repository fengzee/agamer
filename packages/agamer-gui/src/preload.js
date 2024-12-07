const { contextBridge } = require('electron');
const { DeviceManager, Screencap } = require('fadb');

const deviceManager = new DeviceManager();
const screencap = new Screencap();

contextBridge.exposeInMainWorld('electronAPI', {
  deviceManager: {
    tap: (deviceSerial, x, y) => deviceManager.tap(deviceSerial, x, y),
    getDevices: () => deviceManager.getDevices(),
    setDevice: (serial) => deviceManager.setDevice(serial),
  },
  screencap: {
    capture: () => screencap.capture()
  }
}); 
