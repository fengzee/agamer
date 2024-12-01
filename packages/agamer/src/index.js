#!/usr/bin/env node

const { log } = require('./log');
const { getOptions } = require('./config');
const Controller = require('./control');
const { MESSAGES } = require('./constants');
const { ImageInteraction } = require('fadb');

async function main() {
  const options = getOptions();

  log(MESSAGES.START, options);
  log(MESSAGES.COMMANDS_HELP);

  switch (options.task) {
    case 'test':
      const imageInteraction = new ImageInteraction();
      await imageInteraction.init();
      await imageInteraction.tapText('高级收益');
      break;
    default:
      const controller = new Controller(options);
      await controller.run();
  }

  log(MESSAGES.QUIT);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
