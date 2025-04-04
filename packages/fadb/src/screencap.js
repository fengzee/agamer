const { spawn } = require('child_process');

class Screencap {
  constructor() {
    this.streamProcess = null;
  }

  async capture() {
    return new Promise((resolve, reject) => {
      const process = spawn('adb', ['exec-out', 'screencap', '-p']);
      const chunks = [];

      process.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Screenshot failed'));
          return;
        }

        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      process.on('error', (err) => reject(err));
    });
  }

  async captureToFile(filepath) {
    const buffer = await this.capture();
    require('fs').writeFileSync(filepath, buffer);
  }
  
  /**
   * 开始持续捕获屏幕
   * @param {string} deviceSerial 设备序列号
   * @param {Function} onFrame 每次获取到新帧时的回调函数，接收一个 Buffer 参数
   * @param {Function} onError 错误处理回调
   * @returns {Promise<void>}
   */
  startLiveCapture(deviceSerial, onFrame, onError) {
    if (this.streamProcess) {
      this.stopLiveCapture();
    }
    
    const args = deviceSerial ? ['-s', deviceSerial, 'exec-out', 'screencap', '-p'] : ['exec-out', 'screencap', '-p'];
    this.streamProcess = spawn('adb', args);
    
    let frameBuffer = [];
    let processExited = false;
    
    // 定义捕获下一帧的函数
    const captureNextFrame = () => {
      if (processExited || !this.streamProcess) return;
      
      const process = spawn('adb', args);
      const chunks = [];
      
      process.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      process.on('close', (code) => {
        if (code !== 0 || processExited || !this.streamProcess) {
          if (code !== 0 && onError) {
            onError(new Error(`Screenshot failed with code ${code}`));
          }
          return;
        }
        
        try {
          const buffer = Buffer.concat(chunks);
          if (buffer.length > 0 && onFrame) {
            onFrame(buffer);
          }
          
          // 在短暂延迟后捕获下一帧
          setTimeout(captureNextFrame, 100);
        } catch (error) {
          if (onError) onError(error);
        }
      });
      
      process.on('error', (err) => {
        if (onError) onError(err);
      });
    };
    
    // 开始捕获循环
    captureNextFrame();
    
    return Promise.resolve();
  }
  
  /**
   * 停止持续捕获屏幕
   */
  stopLiveCapture() {
    if (this.streamProcess) {
      this.streamProcess.kill();
      this.streamProcess = null;
    }
  }
}

module.exports = Screencap;
