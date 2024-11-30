const { spawn } = require('child_process');
const { log, error } = require('./log');

// 命令和响应标记
const SHELL_SIGNALS = {
  READY: 'READY',
  INPUT_INJECTED: 'Input events injected'
};

// 时间配置（毫秒）
const DELAYS = {
  CONNECT_STABLE_CHECK: 500,   // 连接稳定性二次确认延迟
  HEARTBEAT_INTERVAL: 1000,    // 心跳检测间隔
  RECONNECT_INTERVAL: 3000,    // 断开后重连尝试间隔
  COMMAND_TIMEOUT: 5000        // 命令执行超时时间
};

// Shell 命令模板
const SHELL_COMMANDS = {
  HEARTBEAT: `echo "${SHELL_SIGNALS.READY}"\n`,
  TAP: (x, y) => `input tap ${x} ${y} && echo "${SHELL_SIGNALS.READY}"\n`
};

let adbProcess = null;
let heartbeatInterval = null;
let isConnected = false;
let reconnectInterval = null;
let commandQueue = [];
let isProcessing = false;
let currentCommand = null;

function init() {
  connect();
  startHeartbeat();
}

function connect() {
  if (adbProcess) {
    adbProcess.kill();
    adbProcess = null;
  }

  adbProcess = spawn('adb', ['shell']);
  
  adbProcess.stdout.on('data', handleShellOutput);
  adbProcess.stderr.on('data', handleShellError);
  adbProcess.on('error', handleDisconnect);
  adbProcess.on('close', handleDisconnect);

  // 发送测试命令验证连接
  adbProcess.stdin.write(SHELL_COMMANDS.HEARTBEAT, (err) => {
    if (!err) {
      // 等待一段时间后进行二次确认
      setTimeout(() => {
        if (adbProcess && !adbProcess.killed) {
          adbProcess.stdin.write(SHELL_COMMANDS.HEARTBEAT, (err) => {
            if (!err) {
              isConnected = true;
              log('adb shell 已连接');
              if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
              }
            }
          });
        }
      }, DELAYS.CONNECT_STABLE_CHECK);
    }
  });
}

function handleShellOutput(data) {
  const output = data.toString().trim();
  if (output === SHELL_SIGNALS.READY || output.includes(SHELL_SIGNALS.INPUT_INJECTED)) {
    if (currentCommand && isProcessing) {
      const { callback } = currentCommand;
      currentCommand = null;
      callback(true);
      isProcessing = false;
      processQueue();
    }
  }
}

function handleShellError(data) {
  const error = data.toString().trim();
  if (currentCommand && isProcessing) {
    const { callback } = currentCommand;
    currentCommand = null;
    callback(false);
    isProcessing = false;
    processQueue();
  }
}

function handleDisconnect() {
  if (isConnected) {
    error('adb 设备连接已断开，等待重连...');
  }
  
  isConnected = false;
  if (adbProcess) {
    adbProcess.kill();
    adbProcess = null;
  }

  if (currentCommand) {
    currentCommand.callback(false);
    currentCommand = null;
  }
  isProcessing = false;
  commandQueue = [];

  if (!reconnectInterval) {
    reconnectInterval = setInterval(() => {
      if (!isConnected) {
        log('尝试重新连接...');
        connect();
      }
    }, DELAYS.RECONNECT_INTERVAL);
  }
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  heartbeatInterval = setInterval(() => {
    if (!adbProcess || adbProcess.killed) {
      handleDisconnect();
      return;
    }

    adbProcess.stdin.write(SHELL_COMMANDS.HEARTBEAT, (err) => {
      if (err) {
        handleDisconnect();
      }
    });
  }, DELAYS.HEARTBEAT_INTERVAL);
}

function tap(x, y) {
  return new Promise((resolve) => {
    if (!isConnected) {
      log('点击操作已跳过（设备未连接）');
      resolve(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (currentCommand && currentCommand.callback === resolve) {
        error('点击命令执行超时');
        currentCommand = null;
        isProcessing = false;
        resolve(false);
        processQueue();
      }
    }, DELAYS.COMMAND_TIMEOUT);

    const command = {
      input: SHELL_COMMANDS.TAP(x, y),
      callback: (success) => {
        clearTimeout(timeout);
        resolve(success);
      }
    };
    
    commandQueue.push(command);
    processQueue();
  });
}

function processQueue() {
  if (isProcessing || commandQueue.length === 0 || !isConnected || currentCommand) {
    return;
  }

  isProcessing = true;
  currentCommand = commandQueue.shift();

  adbProcess.stdin.write(currentCommand.input, (err) => {
    if (err) {
      error('发送点击命令失败');
      handleDisconnect();
      currentCommand.callback(false);
      currentCommand = null;
      isProcessing = false;
    }
  });
}

function cleanup() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }

  if (adbProcess) {
    adbProcess.kill();
    adbProcess = null;
  }

  commandQueue = [];
  isProcessing = false;
  currentCommand = null;
}

module.exports = {
  init,
  tap,
  cleanup,
  isConnected: () => isConnected
};
