const DELAYS = {
  RETRY_INTERVAL: 1000,  // 各种失败情况下的重试间隔
};

const COMMANDS = {
  PAUSE: ['p', 'P'],
  QUIT: ['q', 'Q', '\u0003']
};

const MESSAGES = {
  START: '开始点击操作，配置: ',
  COMMANDS_HELP: `按 ${COMMANDS.PAUSE[0]} 切换暂停/继续，${COMMANDS.QUIT[0]} 或 Ctrl+C 退出`,
  SHELL_CONNECTED: 'adb shell 已连接',
  SHELL_DISCONNECTED: 'adb 设备连接已断开，等待重连...',
  SHELL_RECONNECTING: '尝试重新连接...',
  SCREEN_SIZE: (width, height) => `屏幕尺寸: ${width}x${height}`,
  PAUSED: '操作已手动暂停，按 p 继续',
  RESUMED: '操作已继续',
  REST_PLAN: (ms) => `计划在 ${ms} ms 后自动休息`,
  REST_START: (ms) => `开始自动休息 ${ms} ms`,
  CLICK_INFO: (x, y, d) => `点击坐标: (${x}, ${y})${d > 0 ? `, 下次点击间隔: ${d} ms` : ''}`,
  QUIT: '停止点击操作并退出',
  REST_CONTINUE: (ms) => `继续自动休息，剩余 ${ms} ms`
};

module.exports = {
  COMMANDS,
  MESSAGES,
  DELAYS
};
