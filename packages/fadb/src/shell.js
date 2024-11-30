const { spawn } = require('child_process');
const EventEmitter = require('events');

const DELAYS = {
  CONNECT_STABLE_CHECK: 500,
  HEARTBEAT_INTERVAL: 1000,
  RECONNECT_INTERVAL: 3000,
  TAP_INTERVAL: 18,
};

class Shell extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.heartbeatInterval = null;
    this.reconnectInterval = null;
    this.isConnected = false;
  }

  init() {
    this.connect();
    this.startHeartbeat();
  }

  connect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    this.process = spawn('adb', ['shell']);
    
    this.process.on('error', () => this.handleDisconnect());
    this.process.on('close', () => this.handleDisconnect());

    this.process.stdin.write('echo 1\n', (err) => {
      if (!err) {
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.stdin.write('echo 1\n', (err) => {
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

  handleDisconnect() {
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
          this.connect();
        }
      }, DELAYS.RECONNECT_INTERVAL);
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (!this.process || this.process.killed) {
        this.handleDisconnect();
        return;
      }

      this.process.stdin.write('echo 1\n', (err) => {
        if (err) {
          this.handleDisconnect();
        }
      });
    }, DELAYS.HEARTBEAT_INTERVAL);
  }

  tap(x, y) {
    return new Promise((resolve) => {
      if (!this.isConnected) {
        resolve(false);
        return;
      }

      this.process.stdin.write(`input tap ${x} ${y}\n`, (err) => {
        if (err) {
          this.handleDisconnect();
          resolve(false);
          return;
        }
        
        setTimeout(() => resolve(true), DELAYS.TAP_INTERVAL);
      });
    });
  }

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
}

module.exports = Shell; 