import { Button } from './ui/Button.js';
import { Screen } from './control/Screen.js';
import { DeviceList } from './control/DeviceList.js';
import { generateRandomValue } from './utils/random.js';

const { deviceManager, screencap } = window.electronAPI;

// 初始化各个管理器
const screen = new Screen('screen', screencap);
const deviceList = new DeviceList('devices', deviceManager);
const refreshDevicesBtn = new Button('refresh-devices');
const refreshScreenBtn = new Button('refresh-screen');

// 设置设备选择回调
deviceList.setOnDeviceSelected(async (deviceSerial) => {
  if (deviceSerial) {
    await captureScreen();
  }
});

// 屏幕刷新处理
async function captureScreen() {
  if (!deviceList.currentDevice) {
    console.log('请先选择一个设备');
    return;
  }

  await refreshScreenBtn.wrapOperation(async () => {
    await screen.captureAndDisplay();
  });
}

// 设备列表刷新处理
async function updateDeviceList() {
  await refreshDevicesBtn.wrapOperation(async () => {
    await deviceList.updateDeviceList();
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

// 添加点击控制相关变量
let clickInterval = null;
let selectedArea = null;
const defaultConfig = {
  dMin: 50,
  dMax: 200
};

// 监听区域选择事件
screen.canvas.addEventListener('areaSelected', (event) => {
  selectedArea = event.detail;
  console.log('选择区域:', selectedArea);
});

// 监听单击事件
screen.canvas.addEventListener('singleClick', async (event) => {
  const { x, y } = event.detail;
  console.log(`单击坐标: (${x}, ${y})`);
  
  if (deviceList.currentDevice) {
    await deviceManager.tap(deviceList.currentDevice, x, y);
  }
});

// 监听键盘事件
screen.canvas.addEventListener('keyEvent', async (event) => {
  const { keycode } = event.detail;
  console.log(`发送键盘事件: ${keycode}`);
  
  if (deviceList.currentDevice) {
    await deviceManager.sendKeyEvent(deviceList.currentDevice, keycode);
  }
});

// 添加开始/停止按钮事件监听
document.getElementById('toggle-click').addEventListener('click', () => {
  const button = document.getElementById('toggle-click');
  
  if (clickInterval) {
    // 停止点击
    clearInterval(clickInterval);
    clickInterval = null;
    button.textContent = '开始点击';
    button.classList.remove('active');
  } else {
    // 开始点击
    if (!selectedArea) {
      console.log('请先选择点击区域');
      return;
    }
    
    button.textContent = '停止点击';
    button.classList.add('active');
    
    const click = async () => {
      const x = generateRandomValue(selectedArea.xMin, selectedArea.xMax);
      const y = generateRandomValue(selectedArea.yMin, selectedArea.yMax);
      
      if (deviceList.currentDevice) {
        await deviceManager.tap(deviceList.currentDevice, x, y);
        console.log(`点击坐标: (${x}, ${y})`);
      }
    };

    const scheduleNextClick = () => {
      const delay = generateRandomValue(defaultConfig.dMin, defaultConfig.dMax);
      clickInterval = setTimeout(async () => {
        await click();
        scheduleNextClick();
      }, delay);
    };

    scheduleNextClick();
  }
});

// 初始化
updateDeviceList();
