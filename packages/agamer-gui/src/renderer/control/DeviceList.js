/**
 * 设备列表管理类，处理设备列表的显示和选择
 */
export class DeviceList {
  constructor(containerId, deviceManager) {
    this.container = document.getElementById(containerId);
    this.deviceManager = deviceManager;
    this.currentDevice = null;
    this.onDeviceSelected = null;
  }

  setOnDeviceSelected(callback) {
    this.onDeviceSelected = callback;
  }

  async updateDeviceList() {
    const devices = await this.deviceManager.getDevices();
    this.container.innerHTML = '';
    
    this._handleCurrentDevice(devices);
    this._renderDeviceList(devices);
  }

  _handleCurrentDevice(devices) {
    if (this.currentDevice && !devices.find(device => device.serial === this.currentDevice)) {
      this.currentDevice = null;
    }
    
    if (!this.currentDevice && devices.length === 1) {
      this.currentDevice = devices[0].serial;
      this.deviceManager.setDevice(this.currentDevice);
      this.onDeviceSelected?.(this.currentDevice);
    }
  }

  _renderDeviceList(devices) {
    devices.forEach(device => {
      const deviceElement = document.createElement('div');
      deviceElement.className = `device-item ${this.currentDevice === device.serial ? 'active' : ''}`;
      deviceElement.textContent = `${device.serial} (${device.status})`;
      deviceElement.onclick = async () => {
        if (await this.deviceManager.setDevice(device.serial)) {
          this.currentDevice = device.serial;
          this.updateDeviceList();
          this.onDeviceSelected?.(this.currentDevice);
        }
      };
      this.container.appendChild(deviceElement);
    });
  }
} 