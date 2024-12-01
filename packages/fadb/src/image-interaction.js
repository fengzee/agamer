const { spawn } = require('child_process');
const EventEmitter = require('events');
const Shell = require('./shell');
const Screencap = require('./screencap');
const Tesseract = require('tesseract.js');
const Logger = require('flog');

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
    this.logger = Logger.with({ appName: 'agamer' });
  }

  async init() {
    this.logger.log('初始化 OCR 引擎...');
    this._worker = await Tesseract.createWorker('chi_sim');
    await this.shell.init();
    return new Promise((resolve) => {
      this.shell.on('connected', () => {
        this.logger.log('ImageInteraction 初始化完成');
        resolve(true);
      });
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
    this.logger.log(`尝试查找并点击文字: "${text}" (置信度 >= ${confidence})`);

    try {
      const screenshot = await this.screencap.capture();
      this.logger.log('已获取屏幕截图');
      
      const result = await this._worker.recognize(screenshot, { timeout });
      this.logger.log(`OCR 识别完成，找到 ${result.data.words.length} 个词汇：\n${
        result.data.words.map(word => `  ${word.text} (${word.confidence})`).join('\n')
      }`);

      for (const word of result.data.words) {
        if (word.text.includes(text) && word.confidence >= confidence) {
          const { x0, y0, x1, y1 } = word.bbox;
          const x = Math.floor((x0 + x1) / 2);
          const y = Math.floor((y0 + y1) / 2);
          
          this.logger.log(`找到匹配文字: "${word.text}", 置信度: ${word.confidence}, 位置: (${x}, ${y})`);
          
          await this.shell.tap(x, y);
          this.emit('tap', { text, x, y, confidence: word.confidence });
          return;
        }
      }

      this.logger.log(`未找到文字: "${text}"`);
      this.emit('notFound', { text });
      return false;

    } catch (error) {
      this.logger.error('操作失败:', error);
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
    this.logger.log('清理资源...');
    if (this._worker) {
      await this._worker.terminate();
      this._worker = null;
    }
    if (this.shell) {
      this.shell.cleanup();
      this.shell = null;
    }
    this.logger.cleanup();
  }
}

module.exports = ImageInteraction; 