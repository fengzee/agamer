const { contextBridge, ipcRenderer } = require('electron');
const { DeviceManager, Screencap } = require('fadb');

const deviceManager = new DeviceManager();
const screencap = new Screencap();

// 为屏幕截图添加 IPC 通信
let frameCount = 0;

// 设置监听器接收主进程图像数据
ipcRenderer.on('screencap-frame', (event, imageBuffer) => {
  window.dispatchEvent(new CustomEvent('screencap-frame', { 
    detail: { imageBuffer, frameId: frameCount++ } 
  }));
});

ipcRenderer.on('screencap-error', (event, errorMessage) => {
  window.dispatchEvent(new CustomEvent('screencap-error', { 
    detail: { error: errorMessage } 
  }));
});

contextBridge.exposeInMainWorld('electronAPI', {
  deviceManager: {
    tap: (deviceSerial, x, y) => deviceManager.tap(deviceSerial, x, y),
    getDevices: () => deviceManager.getDevices(),
    setDevice: (serial) => deviceManager.setDevice(serial),
    sendKeyEvent: (deviceSerial, keycode) => deviceManager.sendKeyEvent(deviceSerial, keycode),
  },
  screencap: {
    capture: () => screencap.capture(),
    startLiveCapture: (deviceSerial) => {
      // 通过 IPC 告诉主进程开始截图
      ipcRenderer.send('start-live-capture', { deviceSerial });
      return Promise.resolve();
    },
    stopLiveCapture: () => {
      // 通过 IPC 告诉主进程停止截图
      ipcRenderer.send('stop-live-capture');
      return Promise.resolve();
    }
  }
});
