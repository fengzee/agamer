const { spawn } = require('child_process');
const EventEmitter = require('events');
const Shell = require('./shell');
const Screencap = require('./screencap');
const Tesseract = require('tesseract.js');

const DELAYS = {
  COMMAND_INTERVAL: 18,
  OCR_TIMEOUT: 10000
};

class ImageInteraction extends EventEmitter {
  constructor() {
    super();
    this.shell = new Shell();
    this.screencap = new Screencap();
    this._worker = null;
  }

  async init() {
    this._worker = await Tesseract.createWorker('chi_sim');
    await this.shell.init();
    return new Promise((resolve) => {
      this.shell.on('connected', () => resolve(true));
    });
  }

  /**
   * 在屏幕上查找并点击包含指定文字的按钮
   * @param {string} text 要查找的文字
   * @param {Object} options 可选配置
   * @param {number} options.confidence 文字匹配的置信度，默认0.7
   * @param {number} options.timeout OCR超时时间，默认10秒
   * @returns {Promise<boolean>} 是否成功点击
   */
  async tapText(text, options = {}) {
    const { confidence = 0.7, timeout = DELAYS.OCR_TIMEOUT } = options;

    try {
      // 截图
      const screenshot = await this.screencap.capture();
      
      // OCR识别
      const result = await this._worker.recognize(screenshot, {
        timeout,
      });

      // 查找文字位置
      for (const word of result.data.words) {
        if (word.text.includes(text) && word.confidence >= confidence) {
          const { x0, y0, x1, y1 } = word.bbox;
          // 计算文字中心点
          const x = Math.floor((x0 + x1) / 2);
          const y = Math.floor((y0 + y1) / 2);
          
          // 点击
          const success = await this.shell.tap(x, y);
          if (success) {
            this.emit('tap', { text, x, y, confidence: word.confidence });
            return true;
          }
        }
      }

      this.emit('notFound', { text });
      return false;

    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  /**
   * 在屏幕上查找文字是否存在
   * @param {string} text 要查找的文字
   * @param {Object} options 可选配置
   * @returns {Promise<{exists: boolean, confidence?: number, position?: {x: number, y: number}}>}
   */
  async findText(text, options = {}) {
    const { confidence = 0.7, timeout = DELAYS.OCR_TIMEOUT } = options;

    try {
      const screenshot = await this.screencap.capture();
      const result = await this._worker.recognize(screenshot, {
        timeout,
      });

      for (const word of result.data.words) {
        if (word.text.includes(text) && word.confidence >= confidence) {
          const { x0, y0, x1, y1 } = word.bbox;
          return {
            exists: true,
            confidence: word.confidence,
            position: {
              x: Math.floor((x0 + x1) / 2),
              y: Math.floor((y0 + y1) / 2)
            }
          };
        }
      }

      return { exists: false };

    } catch (error) {
      this.emit('error', error);
      return { exists: false };
    }
  }

  async cleanup() {
    if (this._worker) {
      await this._worker.terminate();
      this._worker = null;
    }
    if (this.shell) {
      this.shell.cleanup();
      this.shell = null;
    }
  }
}

module.exports = ImageInteraction; 