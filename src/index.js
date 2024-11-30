#!/usr/bin/env node

const { spawn } = require('child_process');
const { log, error } = require('./log');
const { generateRandomValue } = require('./random');
const { getOptions } = require('./config');

const options = getOptions();

let nextPauseTime = null;

(function main() {  
  log('开始点击操作..., ', options);
  startClicking(options);
})();

function startClicking(options) {
  startTime = Date.now();
  generateNextPause(options);
  
  scheduleNextClick(options, generateRandomValue(options.dMin, options.dMax));

  process.on('SIGINT', () => {
    log('点击操作已停止。');
    process.exit(0);
  });
}

function generateNextPause(options) {
  const pauseInterval = generateRandomValue(options.pauseIntervalMin, options.pauseIntervalMax);
  nextPauseTime = Date.now() + pauseInterval;
  log(`计划在 ${pauseInterval} ms 后暂停`);
}

function scheduleNextClick(options, d) {
  setTimeout(() => {
    if (nextPauseTime && Date.now() >= nextPauseTime) {
      const pauseDuration = generateRandomValue(options.pauseDurationMin, options.pauseDurationMax);
      log(`暂停操作 ${pauseDuration} ms`);
      
      setTimeout(() => {
        generateNextPause(options);
        const nextD = generateRandomValue(options.dMin, options.dMax);
        executeNextClick(options, nextD);
      }, pauseDuration);
      
      return;
    }
    
    executeNextClick(options, d);
  }, d);
}

function executeNextClick(options, d) {
  const x = generateRandomValue(options.xMin, options.xMax);
  const y = generateRandomValue(options.yMin, options.yMax);
  const nextD = generateRandomValue(options.dMin, options.dMax);

  executeAdbTap(x, y);
  log(`点击坐标: (${x}, ${y}), 下次点击间隔: ${d} ms`);

  scheduleNextClick(options, nextD);
}

function executeAdbTap(x, y) {
  const adbProcess = spawn('adb', ['shell', 'input', 'tap', x.toString(), y.toString()]);
  adbProcess.on('error', (err) => {
    error('执行 adb 命令出错: ', err);
  });
  adbProcess.on('close', (code) => {
    if (code !== 0) {
      error('adb 命令执行失败，退出码: ', code);
    }
  });
}
