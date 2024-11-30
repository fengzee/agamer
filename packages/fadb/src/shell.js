const { spawn } = require('child_process');
const EventEmitter = require('events');

const DELAYS = {
  CONNECT_STABLE_CHECK: 500,
  HEARTBEAT_INTERVAL: 1000,
  RECONNECT_INTERVAL: 3000,
  COMMAND_INTERVAL: 18,
  QUERY_TIMEOUT: 3000
};

const COMMANDS = {
  ECHO: 'echo 1',
  TAP: (x, y) => `input tap ${x} ${y}`,
  GET_SCREEN_SIZE: 'wm size'
};

/**
 * 提供 adb shell 功能
 */
class Shell extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.heartbeatInterval = null;
    this.reconnectInterval = null;
    this.isConnected = false;
  }

  /**
   * 启动一个 adb shell 进程，并开始心跳和连接维护，必要时重新连接
   */
  init() {
    this._connect();
    this._startHeartbeat();
  }

  /**
   * 点击屏幕上的某个点
   * 使用者应等待返回的结果再进行下一步操作（如再次点击），避免高频点击造成 Android 内部队列拥塞
   *
   * @returns {Promise<boolean>} 点击是否成功
   * 
   */
  async tap(x, y) {
    return new Promise((resolve) => {
      if (!this.isConnected) {
        resolve(false);
        return;
      }

      this.process.stdin.write(`${COMMANDS.TAP(x, y)}\n`, (err) => {
        if (err) {
          this._handleDisconnect();
          resolve(false);
          return;
        }
        
        setTimeout(() => resolve(true), DELAYS.COMMAND_INTERVAL);
      });
    });
  }

  /**
   * 获取屏幕尺寸
   *
   * @returns {Promise<{width: number, height: number}>}
   */
  async getScreenSize() {
    return this._query(
      COMMANDS.GET_SCREEN_SIZE,
      (output) => {
        const match = output.match(/Physical size: (\d+)x(\d+)/);
        if (match) {
          return {
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10)
          };
        }
      }
    );
  }

  /**
   * 断开连接
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  _connect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.process = spawn('adb', ['shell']);
    
    this.process.on('error', () => this._handleDisconnect());
    this.process.on('close', () => this._handleDisconnect());

    this.process.stdin.write(`${COMMANDS.ECHO}\n`, (err) => {
      if (!err) {
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.stdin.write(`${COMMANDS.ECHO}\n`, (err) => {
              if (!err) {
                this.isConnected = true;
                this.emit('connected');
                if (this.reconnectInterval) {
                  clearInterval(this.reconnectInterval);
                  this.reconnectInterval = null;
                }
              }
            });
          }
        }, DELAYS.CONNECT_STABLE_CHECK);
      }
    });
  }

  _handleDisconnect() {
    if (this.isConnected) {
      this.emit('disconnected');
    }
    
    this.isConnected = false;
    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        if (!this.isConnected) {
          this.emit('reconnecting');
          this._connect();
        }
      }, DELAYS.RECONNECT_INTERVAL);
    }
  }

  _startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.process || this.process.killed) {
        this._handleDisconnect();
        return;
      }

      this.process.stdin.write(`${COMMANDS.ECHO}\n`, (err) => {
        if (err) {
          this._handleDisconnect();
        }
      });
    }, DELAYS.HEARTBEAT_INTERVAL);
  }

  async _query(command, parser) {
    return new Promise((resolve) => {
      if (!this.isConnected) {
        resolve(null);
        return;
      }

      let output = '';
      const onData = (data) => {
        output += data.toString();
        const result = parser(output);
        if (result) {
          this.process.stdout.removeListener('data', onData);
          resolve(result);
        }
      };

      this.process.stdout.on('data', onData);
      
      this.process.stdin.write(`${command}\n`, (err) => {
        if (err) {
          this._handleDisconnect();
          resolve(null);
          return;
        }
      });

      setTimeout(() => {
        this.process.stdout.removeListener('data', onData);
        resolve(null);
      }, DELAYS.QUERY_TIMEOUT);
    });
  }
}

module.exports = Shell;
