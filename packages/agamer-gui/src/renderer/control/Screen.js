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
    
    // 绑定鼠标事件
    this._initDragEvents();
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
      this._saveSelectedArea(endX, endY);
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
    const availableHeight = container.clientHeight - 50;
    
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
  }
} 