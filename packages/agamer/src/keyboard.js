const { COMMANDS } = require('./constants');

class Keyboard {
  constructor(controller) {
    this.controller = controller;
  }

  start() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', this.handleKeyPress.bind(this));
  }

  handleKeyPress(key) {
    const keyHandlers = {
      [COMMANDS.PAUSE]: () => this.controller.handlePauseResume(),
      [COMMANDS.RESUME]: () => this.controller.handleResume(),
      [COMMANDS.QUIT]: () => this.controller.stop()
    };

    for (const [command, handler] of Object.entries(keyHandlers)) {
      if (command.includes(key)) {
        handler();
        break;
      }
    }
  }

  stop() {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeAllListeners('data');
  }
}

module.exports = Keyboard; 
