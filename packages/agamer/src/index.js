#!/usr/bin/env node

const { log } = require('./log');
const { getOptions } = require('./config');
const Controller = require('./control');
const { MESSAGES } = require('./constants');

async function main() {
  const options = getOptions();
  const controller = new Controller(options);

  log(MESSAGES.START, options);
  log(MESSAGES.COMMANDS_HELP);

  await controller.run();

  log(MESSAGES.QUIT);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
