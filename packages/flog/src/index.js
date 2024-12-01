const fs = require('fs');
const path = require('path');
const os = require('os');

const loggerInstances = new Map();
const streamInstances = new Map();

class Logger {
  static with(options = {}) {
    const appName = options.appName || 'app';
    const existingLogger = loggerInstances.get(appName);
    if (existingLogger) {
      return existingLogger;
    }
    return new Logger(options);
  }

  // 私有构造函数，不应直接调用，请使用 Logger.with() 创建实例
  constructor(options = {}) {
    this.appName = options.appName || 'app';
    this.logDir = options.logDir || path.join(
      os.homedir(), 'Library', 'Logs', this.appName
    );

    this.init();
    loggerInstances.set(this.appName, this);
  }

  init() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // 检查是否已存在该 appName 的 stream
    if (!streamInstances.has(this.appName)) {
      const timestamp = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/[\/\s:]/g, '-');

      const logFile = path.join(this.logDir, `${timestamp}.log`);
      this.logStream = fs.createWriteStream(logFile, { flags: 'a' });
      streamInstances.set(this.appName, this.logStream);

      const startMessage = `[${this._formatTime()}] 日志文件已创建: ${logFile}\n`;
      this.logStream.write(startMessage);
      console.log(startMessage.trim());

      // 只在第一次创建时添加 exit 处理
      process.on('exit', () => this.cleanup());
    } else {
      // 复用已存在的 stream
      this.logStream = streamInstances.get(this.appName);
    }
  }

  log(...args) {
    this._writeLog('info', ...this._formatArgs(args));
  }

  error(...args) {
    this._writeLog('error', ...this._formatArgs(args));
  }

  _writeLog(level, ...args) {
    const timestamp = this._formatTime();
    const message = `[${timestamp}] ${args.join(' ')}\n`;
    
    if (level === 'error') {
      console.error(message.trim());
    } else {
      console.log(message.trim());
    }
    
    if (this.logStream) {
      this.logStream.write(message);
    }
  }

  _formatArgs(args) {
    return args.map(arg => {
      if (typeof arg === 'string') {
        return arg.replace(/(\d{4,})(?= ms)/g, num => 
          num.replace(/(\d)(?=(\d{3})+$)/g, '$1,')
        );
      }
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2)
          .replace(/"(\w+)": (\d{4,})(,?\n)/g, (_, key, num, end) => 
            `"${key}": ${num.replace(/(\d)(?=(\d{3})+$)/g, '$1,')}${end}`
          );
      }
      return arg;
    });
  }

  _formatTime(date = new Date()) {
    const pad = (n, width = 2) => n.toString().padStart(width, '0');
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const milliseconds = pad(date.getMilliseconds(), 3);
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  cleanup() {
    if (this.logStream) {
      streamInstances.delete(this.appName);
      loggerInstances.delete(this.appName);
      this.logStream.end();
      this.logStream = null;
    }
  }
}

module.exports = Logger;
