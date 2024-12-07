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
    
    // 添加 resize 观察器
    this.resizeObserver = new ResizeObserver(() => this._handleResize());
    const container = document.querySelector('.screen-container');
    this.resizeObserver.observe(container);
    
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
      const wrapperRect = document.querySelector('.canvas-wrapper').getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // 计算 canvas 相对于 wrapper 的偏移，考虑 DPR
      const canvasOffsetX = (rect.left - wrapperRect.left) * dpr;
      const canvasOffsetY = (rect.top - wrapperRect.top) * dpr;
      
      this.isDrawing = true;
      // 保存鼠标相对于 canvas 的实际坐标，考虑偏移和 DPR
      this.startX = (e.clientX - rect.left) * dpr + canvasOffsetX;
      this.startY = (e.clientY - rect.top) * dpr + canvasOffsetY;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const wrapperRect = document.querySelector('.canvas-wrapper').getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const canvasOffsetX = (rect.left - wrapperRect.left) * dpr;
      const canvasOffsetY = (rect.top - wrapperRect.top) * dpr;
      
      const currentX = (e.clientX - rect.left) * dpr + canvasOffsetX;
      const currentY = (e.clientY - rect.top) * dpr + canvasOffsetY;
      
      this._redrawImage();
      this._drawSelectionBox(currentX, currentY);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (!this.isDrawing) return;
      
      const rect = this.canvas.getBoundingClientRect();
      const wrapperRect = document.querySelector('.canvas-wrapper').getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const canvasOffsetX = (rect.left - wrapperRect.left) * dpr;
      const canvasOffsetY = (rect.top - wrapperRect.top) * dpr;
      
      const endX = (e.clientX - rect.left) * dpr + canvasOffsetX;
      const endY = (e.clientY - rect.top) * dpr + canvasOffsetY;
      
      this.isDrawing = false;
      this._saveSelectedArea(endX, endY);
    });
  }

  _drawSelectionBox(currentX, currentY) {
    // 保存当前上下文状态
    this.ctx.save();
    
    // 重置变换以使用显示坐标系
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    this.ctx.strokeStyle = 'red';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    
    const width = currentX - this.startX;
    const height = currentY - this.startY;
    
    this.ctx.beginPath();
    this.ctx.rect(this.startX, this.startY, width, height);
    this.ctx.stroke();
    
    // 恢复上下文状态
    this.ctx.restore();
  }

  _saveSelectedArea(endX, endY) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // 计算相对于实际显示尺寸的比例
    const scaleX = this.deviceWidth / (rect.width * dpr);
    const scaleY = this.deviceHeight / (rect.height * dpr);

    // 计算在设备分辨率下的实际坐标
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

    const event = new CustomEvent('areaSelected', { 
        detail: this.selectedArea 
    });
    this.canvas.dispatchEvent(event);
  }

  _redrawImage() {
    // 保存当前上下文状态
    this.ctx.save();
    
    // 重置变换
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 重新应用 DPR 缩放
    this.ctx.scale(dpr, dpr);
    
    const displayWidth = parseInt(this.canvas.style.width);
    const displayHeight = parseInt(this.canvas.style.height);
    
    this.ctx.drawImage(this._currentImage, 0, 0, displayWidth, displayHeight);
    
    // 恢复上下文状态
    this.ctx.restore();
  }

  _displayImage(image) {
    // 保存当前图像引用和设备实际尺寸
    this._currentImage = image;
    this.deviceWidth = image.naturalWidth;
    this.deviceHeight = image.naturalHeight;
    
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;
    const originalRatio = originalHeight / originalWidth;
    
    this.dimensionsElement.textContent = `${originalWidth} x ${originalHeight}`;
    
    const dpr = window.devicePixelRatio || 1;
    const container = document.querySelector('.screen-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 计算适合容器的显示尺寸，同时保持宽高比
    let displayWidth, displayHeight;
    
    if (containerHeight / containerWidth > originalRatio) {
        // 容器更高以宽度为准
        displayWidth = containerWidth;
        displayHeight = containerWidth * originalRatio;
    } else {
        // 容器更宽，以高度为准
        displayHeight = containerHeight;
        displayWidth = containerHeight / originalRatio;
    }
    
    // 设置画布样式尺寸
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    
    // 设置画布实际尺寸（考虑设备像素比）
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    
    // 设置图上下文缩放
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // 清除画布并绘制图像
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);
    this.ctx.drawImage(image, 0, 0, displayWidth, displayHeight);
  }

  _handleResize() {
    if (this._currentImage) {
        this._displayImage(this._currentImage);
    }
  }

  // 在类���末尾添加清理方法
  destroy() {
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
    }
  }
} 