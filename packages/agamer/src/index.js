#!/usr/bin/env node

const { log } = require('./log');
const { getOptions } = require('./config');
const Controller = require('./control');
const { MESSAGES } = require('./constants');

(function main() {
  const options = getOptions();
  const controller = new Controller(options);

  log(MESSAGES.START, options);
  log(MESSAGES.COMMANDS_HELP);

  controller.start();
})();
