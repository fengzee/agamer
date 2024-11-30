#!/usr/bin/env node

const { log } = require('./log');
const { getOptions } = require('./config');
const adb = require('./adb');
const Controller = require('./control');

(function main() {
  const options = getOptions();
  
  adb.init();
  
  const controller = new Controller(options);
  controller.setupKeyboardControl();

  log('开始点击操作，配置: ', options);
  log('按 p 暂停，r 继续，Ctrl+C 退出');

  controller.start();
})();
