#!/usr/bin/env node

const Logger = require('flog');
const { getOptions } = require('./config');
const Controller = require('./control');
const { MESSAGES } = require('./constants');
const { ImageInteraction } = require('fadb');

const logger = Logger.with({ appName: 'agamer' });

async function main() {
  const options = getOptions();

  logger.log(MESSAGES.START, options);
  logger.log(MESSAGES.COMMANDS_HELP);

  switch (options.task) {
    case 'test':
      const imageInteraction = new ImageInteraction();
      await imageInteraction.init();
      await imageInteraction.tapText('高级');
      break;
    default:
      const controller = new Controller(options);
      await controller.run();
  }

  logger.log(MESSAGES.QUIT);
  logger.cleanup();
  process.exit(0);
}

main().catch(err => {
  logger.error(err);
  logger.cleanup();
  process.exit(1);
});
