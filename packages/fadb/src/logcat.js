const { spawn } = require('child_process');
const EventEmitter = require('events');

class Logcat extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.isRunning = false;
  }

  start(options = {}) {
    if (this.process) {
      this.stop();
    }

    const args = ['logcat'];
    if (options.filter) {
      args.push('*:' + options.filter);
    }

    this.process = spawn('adb', args);
    this.isRunning = true;

    this.process.stdout.on('data', (data) => {
      this.emit('data', data.toString());
    });

    this.process.stderr.on('data', (data) => {
      this.emit('error', data.toString());
    });

    this.process.on('close', () => {
      this.isRunning = false;
      this.emit('close');
    });

    this.process.on('error', (err) => {
      this.isRunning = false;
      this.emit('error', err);
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isRunning = false;
    }
  }
}

module.exports = Logcat;
