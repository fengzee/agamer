const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Screencap } = require('fadb');

// 创建全局屏幕捕获实例
const screencap = new Screencap();
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: true
    },
  });

  mainWindow.loadFile('../ui/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 添加 IPC 处理
ipcMain.on('start-live-capture', (event, { deviceSerial }) => {
  if (!mainWindow) return;
  
  console.log(`开始捕获设备屏幕: ${deviceSerial}`);
  
  // 设置回调函数，用于将图像数据发送回渲染进程
  const onFrame = (imageBuffer) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('screencap-frame', imageBuffer);
    }
  };
  
  const onError = (error) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.error('屏幕捕获错误:', error.message);
      mainWindow.webContents.send('screencap-error', error.message);
    }
  };
  
  // 开始实时屏幕捕获
  screencap.startLiveCapture(deviceSerial, onFrame, onError);
});

ipcMain.on('stop-live-capture', () => {
  console.log('停止屏幕捕获');
  screencap.stopLiveCapture();
});
