/**
 * 屏幕管理类，处理屏幕截图和显示
 */
export class ScreenManager {
  constructor(canvasId, screencap) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.screencap = screencap;
    this.dimensionsElement = document.getElementById('screen-dimensions');
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

  _displayImage(image) {
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