/**
 * 屏幕管理类，处理屏幕截图和显示
 */
export class Screen {
  constructor(canvasId, screencap) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.screencap = screencap;
    this.dimensionsElement = document.getElementById('screen-dimensions');
    
    // 添加框选相关属性
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.selectedArea = null;
    this.scale = 1;
    
    // 添加设备实际尺寸属性
    this.deviceWidth = 0;
    this.deviceHeight = 0;
    
    // 添加点击阈值，如果移动距离小于此值认为是点击而非框选
    this.clickThreshold = 5;
    
    // 添加硬件按钮相关属性
    this.hardwareButtons = [
      { id: 'btn-back', text: '返回', keycode: 'KEYCODE_BACK' },
      { id: 'btn-home', text: '主页', keycode: 'KEYCODE_HOME' },
      { id: 'btn-recents', text: '最近任务', keycode: 'KEYCODE_APP_SWITCH' },
      { id: 'btn-power', text: '电源', keycode: 'KEYCODE_POWER' }
    ];
    
    // 绑定鼠标事件
    this._initDragEvents();
    
    // 创建硬件按钮
    this._createHardwareButtons();
  }

  async captureAndDisplay() {
    this.dimensionsElement.textContent = '';
    
    const imageBuffer = await this.screencap.capture();
    const image = await this._loadImage(imageBuffer);
    this._displayImage(image);
  }

  async _loadImage(imageBuffer) {
    const blob = new Blob([imageBuffer]);
    const url = URL.createObjectURL(blob);
    
    try {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  _initDragEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.isDrawing = true;
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      this._redrawImage();
      this._drawSelectionBox(currentX, currentY);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (!this.isDrawing) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      
      this.isDrawing = false;
      
      // 计算移动距离
      const distanceX = Math.abs(endX - this.startX);
      const distanceY = Math.abs(endY - this.startY);
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      // 如果移动距离小于阈值，则触发单击事件
      if (distance < this.clickThreshold) {
        this._handleSingleClick(endX, endY);
      } else {
        this._saveSelectedArea(endX, endY);
      }
    });
  }

  _drawSelectionBox(currentX, currentY) {
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    const width = currentX - this.startX;
    const height = currentY - this.startY;
    
    this.ctx.beginPath();
    this.ctx.rect(this.startX, this.startY, width, height);
    this.ctx.stroke();
  }

  _saveSelectedArea(endX, endY) {
    // 获取显示尺寸
    const displayWidth = parseInt(this.canvas.style.width);
    const displayHeight = parseInt(this.canvas.style.height);

    // 计算缩放比例（设备实际尺寸与显示尺寸的比例）
    const scaleX = this.deviceWidth / displayWidth;
    const scaleY = this.deviceHeight / displayHeight;

    // 计算实际坐标（映射到设备实际分辨率）
    const realStartX = Math.round(Math.min(this.startX, endX) * scaleX);
    const realEndX = Math.round(Math.max(this.startX, endX) * scaleX);
    const realStartY = Math.round(Math.min(this.startY, endY) * scaleY);
    const realEndY = Math.round(Math.max(this.startY, endY) * scaleY);

    this.selectedArea = {
      xMin: realStartX,
      xMax: realEndX,
      yMin: realStartY,
      yMax: realEndY
    };

    // 触发选择区域变化事件
    const event = new CustomEvent('areaSelected', { 
      detail: this.selectedArea 
    });
    this.canvas.dispatchEvent(event);
  }

  _redrawImage() {
    const displayWidth = parseInt(this.canvas.style.width);
    const displayHeight = parseInt(this.canvas.style.height);
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);
    this.ctx.drawImage(this._currentImage, 0, 0, displayWidth, displayHeight);
  }

  _displayImage(image) {
    // 保存当前图像引用和设备实际尺寸
    this._currentImage = image;
    this.deviceWidth = image.naturalWidth;
    this.deviceHeight = image.naturalHeight;
    
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;
    
    this.dimensionsElement.textContent = `${originalWidth} x ${originalHeight}`;
    
    const originalRatio = originalHeight / originalWidth;
    
    const dpr = window.devicePixelRatio || 1;
    const container = document.querySelector('.screen-container');
    // 减少 availableHeight 来为硬件按钮留出空间，从原来的 50 调整为 100
    const availableHeight = container.clientHeight - 100;
    
    const displayWidth = Math.floor(availableHeight / originalRatio);
    const displayHeight = availableHeight;
    
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);
    this.ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
    
    // 调整硬件按钮的位置
    this._positionHardwareButtons(displayWidth);
  }

  // 处理单击事件
  _handleSingleClick(x, y) {
    // 获取显示尺寸
    const displayWidth = parseInt(this.canvas.style.width);
    const displayHeight = parseInt(this.canvas.style.height);

    // 计算缩放比例（设备实际尺寸与显示尺寸的比例）
    const scaleX = this.deviceWidth / displayWidth;
    const scaleY = this.deviceHeight / displayHeight;

    // 计算实际坐标（映射到设备实际分辨率）
    const realX = Math.round(x * scaleX);
    const realY = Math.round(y * scaleY);

    // 触发单击事件
    const event = new CustomEvent('singleClick', { 
      detail: { x: realX, y: realY } 
    });
    this.canvas.dispatchEvent(event);
    
    // 绘制点击标记
    this._drawClickMarker(x, y);
  }
  
  // 绘制点击标记
  _drawClickMarker(x, y) {
    this._redrawImage();
    
    // 绘制点击标记
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, 10, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // 短暂显示后消失
    setTimeout(() => {
      this._redrawImage();
    }, 300);
  }
  
  /**
   * 创建硬件按钮并添加到屏幕底部
   */
  _createHardwareButtons() {
    // 先检查是否已经存在按钮区域，如果存在则先移除
    const existingButtonContainer = document.querySelector('.hardware-buttons-container');
    if (existingButtonContainer) {
      existingButtonContainer.remove();
    }
    
    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'hardware-buttons-container';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center';
    buttonContainer.style.padding = '10px 0';
    buttonContainer.style.backgroundColor = '#f0f0f0';
    buttonContainer.style.borderTop = '1px solid #ccc';
    buttonContainer.style.gap = '15px';
    
    // 添加按钮
    this.hardwareButtons.forEach(button => {
      const btnElement = document.createElement('button');
      btnElement.id = button.id;
      btnElement.textContent = button.text;
      btnElement.className = 'hardware-button';
      
      // 使用普通按钮样式，与 index.html 一致
      btnElement.style.backgroundColor = '#1a73e8';
      btnElement.style.color = 'white';
      btnElement.style.border = 'none';
      btnElement.style.padding = '8px 16px';
      btnElement.style.borderRadius = '6px';
      btnElement.style.fontSize = '14px';
      btnElement.style.cursor = 'pointer';
      btnElement.style.transition = 'background-color 0.2s, transform 0.1s';
      btnElement.style.fontWeight = '500';
      btnElement.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';
      
      // 添加鼠标悬停效果
      btnElement.addEventListener('mouseover', () => {
        btnElement.style.backgroundColor = '#1557b0';
      });
      
      btnElement.addEventListener('mouseout', () => {
        btnElement.style.backgroundColor = '#1a73e8';
      });
      
      // 添加点击效果
      btnElement.addEventListener('mousedown', () => {
        btnElement.style.transform = 'scale(0.98)';
      });
      
      btnElement.addEventListener('mouseup', () => {
        btnElement.style.transform = 'scale(1)';
      });
      
      // 添加点击事件，触发 keyEvent 自定义事件
      btnElement.addEventListener('click', () => {
        const event = new CustomEvent('keyEvent', { 
          detail: { keycode: button.keycode } 
        });
        this.canvas.dispatchEvent(event);
      });
      
      buttonContainer.appendChild(btnElement);
    });
    
    // 添加按钮容器到屏幕容器中
    const screenContainer = document.querySelector('.screen-container');
    screenContainer.appendChild(buttonContainer);
  }
  
  /**
   * 调整硬件按钮的位置到屏幕底部
   */
  _positionHardwareButtons(displayWidth) {
    const buttonContainer = document.querySelector('.hardware-buttons-container');
    if (buttonContainer) {
      buttonContainer.style.width = `${displayWidth}px`;
    }
  }
} 