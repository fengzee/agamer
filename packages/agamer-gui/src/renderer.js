import { ButtonStateManager } from './ui/ButtonStateManager.js';
import { ScreenManager } from './screen/ScreenManager.js';
import { DeviceListManager } from './device/DeviceListManager.js';

const { deviceManager, screencap } = window.electronAPI;

// 初始化各个管理器
const screenManager = new ScreenManager('screen', screencap);
const deviceListManager = new DeviceListManager('devices', deviceManager);
const refreshDevicesBtn = new ButtonStateManager('refresh-devices');
const refreshScreenBtn = new ButtonStateManager('refresh-screen');

// 设置设备选择回调
deviceListManager.setOnDeviceSelected(async (deviceSerial) => {
  if (deviceSerial) {
    await captureScreen();
  }
});

// 屏幕刷新处理
async function captureScreen() {
  if (!deviceListManager.currentDevice) {
    console.log('请先选择一个设备');
    return;
  }

  await refreshScreenBtn.wrapOperation(async () => {
    await screenManager.captureAndDisplay();
  });
}

// 设备列表刷新处理
async function updateDeviceList() {
  await refreshDevicesBtn.wrapOperation(async () => {
    await deviceListManager.updateDeviceList();
  });
}

// 事件监听
document.getElementById('refresh-devices').addEventListener('click', updateDeviceList);
document.getElementById('refresh-screen').addEventListener('click', captureScreen);

// 添加键盘快捷键支持
document.addEventListener('keydown', async (event) => {
  // 检查是否按下了 Command 键 (Mac) 或 Control 键 (Windows/Linux)
  const isCmdOrCtrl = event.metaKey || event.ctrlKey;
  
  if (isCmdOrCtrl) {
    switch (event.key.toLowerCase()) {
      case 'd':
        event.preventDefault(); // 阻止默认行为
        await updateDeviceList();
        break;
      case 's':
        event.preventDefault(); // 阻止默认行为
        await captureScreen();
        break;
    }
  }
});

// 初始化
updateDeviceList();
