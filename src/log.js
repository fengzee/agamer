const fs = require('fs');
const path = require('path');
const os = require('os');

let logStream;

function log(...args) {
  writeLog('info', ...formatArgs(args));
}

function error(...args) {
  writeLog('error', ...formatArgs(args));
}

function writeLog(level, ...args) {
  if (!logStream) {
    initLogFile();
  }

  const timestamp = formatTime();
  const message = `[${timestamp}] ${args.join(' ')}\n`;
  
  if (level === 'error') {
    console.error(message.trim());
  } else {
    console.log(message.trim());
  }
  logStream.write(message);
}

function formatArgs(args) {
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

function initLogFile() {
  const logDir = path.join(os.homedir(), 'Library', 'Logs', 'agamer');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/[\/\s:]/g, '-');

  const logFile = path.join(logDir, `${timestamp}.log`);
  logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const startMessage = `[${formatTime()}] 日志文件已创建: ${logFile}\n`;
  logStream.write(startMessage);
  console.log(startMessage);

  process.on('exit', () => {
    if (logStream) {
      logStream.end();
    }
  });

  process.on('SIGINT', () => {
    if (logStream) {
      logStream.end();
    }
    process.exit(0);
  });
}

function formatTime(date = new Date()) {
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

module.exports = {
  log,
  error
};
