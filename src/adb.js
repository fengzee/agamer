const { spawn } = require('child_process');
const { log, error } = require('./log');

// 时间配置（毫秒）
const DELAYS = {
  CONNECT_STABLE_CHECK: 500,   // 连接稳定性二次确认延迟
  HEARTBEAT_INTERVAL: 1000,    // 心跳检测间隔
  RECONNECT_INTERVAL: 3000,    // 断开后重连尝试间隔
  TAP_INTERVAL: 18,            // 点击最小间隔
};

// Shell 命令模板
const SHELL_COMMANDS = {
  HEARTBEAT: 'echo 1\n',
  TAP: (x, y) => `input tap ${x} ${y}\n`
};

let adbProcess = null;
let heartbeatInterval = null;
let isConnected = false;
let reconnectInterval = null;

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
  
  adbProcess.on('error', handleDisconnect);
  adbProcess.on('close', handleDisconnect);

  // 发送测试命令验证连接
  adbProcess.stdin.write(SHELL_COMMANDS.HEARTBEAT, (err) => {
    if (!err) {
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

function handleDisconnect() {
  if (isConnected) {
    error('adb 设备连接已断开，等待重连...');
  }
  
  isConnected = false;
  if (adbProcess) {
    adbProcess.kill();
    adbProcess = null;
  }

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

    adbProcess.stdin.write(SHELL_COMMANDS.TAP(x, y), (err) => {
      if (err) {
        error('发送点击命令失败');
        handleDisconnect();
        resolve(false);
        return;
      }
      
      // 强制等待一个最小间隔，避免命令积压
      setTimeout(() => resolve(true), DELAYS.TAP_INTERVAL);
    });
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
}

module.exports = {
  init,
  tap,
  cleanup,
  isConnected: () => isConnected
};
