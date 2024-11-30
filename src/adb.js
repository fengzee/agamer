const { spawn } = require('child_process');
const { log, error } = require('./log');

let adbProcess = null;

function init() {
  adbProcess = spawn('adb', ['shell']);
  log('启动 adb shell 进程...');
  
  adbProcess.on('error', (err) => {
    error('启动 adb shell 失败: ', err);
    process.exit(1);
  });

  adbProcess.on('close', (code) => {
    if (code !== 0) {
      error('adb shell 异常退出，退出码: ', code);
      process.exit(1);
    }
  });
}

function tap(x, y) {
  if (!adbProcess || adbProcess.killed) {
    error('adb shell 进程不可用');
    process.exit(1);
  }

  const command = `input tap ${x} ${y}\n`;
  adbProcess.stdin.write(command, (err) => {
    if (err) {
      error('发送点击命令失败: ', err);
      process.exit(1);
    }
  });
}

function cleanup() {
  if (adbProcess) {
    adbProcess.kill();
    adbProcess = null;
  }
}

module.exports = {
  init,
  tap,
  cleanup
};
