const { log } = require('./log');
const { generateRandomValue } = require('./random');
const { Shell } = require('fadb');
const { MESSAGES, DELAYS } = require('./constants');
const Keyboard = require('./keyboard');

class Controller {
  constructor(options) {
    this.options = options;
    this.shell = null;
    this.keyboard = null;
    this.isManuallyPaused = false;
    this.currentTimeout = null;
    this.nextRestTime = null;
    this.restTimeRemaining = null;
    this.pauseStartTime = null;
    this.isDeviceDisconnected = false;
    this.restPaused = false;
  }

  async run() {
    return new Promise((resolve) => {
      this.quitSignal = resolve;

      this.initAdbShell();
      this.initKeyboard();
    });
  }

  initAdbShell() {
    this.shell = new Shell();
    
    this.shell.on('connected', () => {
      log(MESSAGES.SHELL_CONNECTED);
      if (!this.currentTimeout) {
        this.start();
      }
    });

    this.shell.on('disconnected', () => {
      log(MESSAGES.SHELL_DISCONNECTED);
    });

    this.shell.on('reconnecting', () => {
      log(MESSAGES.SHELL_RECONNECTING);
    });

    this.shell.init();
  }

  initKeyboard() {
    this.keyboard = new Keyboard(this);
    this.keyboard.start();
  }

  start() {
    this.scheduleNextRest();

    const initialDelay = generateRandomValue(this.options.dMin, this.options.dMax);
    this.scheduleNextClick(initialDelay);
  }

  pauseManually() {
    this.isManuallyPaused = true;
    this.pauseStartTime = Date.now();
    if (this.nextRestTime) {
      this.restTimeRemaining = this.nextRestTime - Date.now();
    }
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    log(MESSAGES.PAUSED);
  }

  resumeFromManualPause() {
    log(MESSAGES.RESUMED);
    this.isManuallyPaused = false;

    if (this.restTimeRemaining && this.restTimeRemaining > 0) {
      this.nextRestTime = Date.now() + this.restTimeRemaining;
      log(MESSAGES.REST_PLAN(this.restTimeRemaining));
    }
    this.restTimeRemaining = null;
    this.pauseStartTime = null;

    const nextD = generateRandomValue(this.options.dMin, this.options.dMax);
    this.scheduleNextClick(nextD);
  }

  scheduleNextRest() {
    if (this.options.pauseIntervalMax === 0) {
      this.nextRestTime = null;
      return;
    }

    const restInterval = generateRandomValue(
      this.options.pauseIntervalMin, 
      this.options.pauseIntervalMax
    );
    this.nextRestTime = Date.now() + restInterval;
    log(MESSAGES.REST_PLAN(restInterval));
  }

  scheduleNextClick(d) {
    if (this.isManuallyPaused) return;

    this.currentTimeout = setTimeout(() => {
      this.currentTimeout = null;
      
      if (!this.shell.isConnected) {
        if (!this.restPaused) {
          this.restPaused = true;
          if (this.nextRestTime) {
            this.restTimeRemaining = this.nextRestTime - Date.now();
            this.nextRestTime = null;
          }
        }
        this.scheduleNextClick(DELAYS.RETRY_INTERVAL);
        return;
      }

      if (this.restPaused) {
        this.restPaused = false;
        if (this.restTimeRemaining && this.restTimeRemaining > 0) {
          this.nextRestTime = Date.now() + this.restTimeRemaining;
          log(MESSAGES.REST_PLAN(this.restTimeRemaining));
          this.restTimeRemaining = null;
        }
      }
      
      if (this.nextRestTime && Date.now() >= this.nextRestTime) {
        const restDuration = generateRandomValue(
          this.options.pauseDurationMin, 
          this.options.pauseDurationMax
        );
        log(MESSAGES.REST_START(restDuration));
        
        this.currentTimeout = setTimeout(() => {
          this.currentTimeout = null;
          this.scheduleNextRest();
          const nextD = generateRandomValue(this.options.dMin, this.options.dMax);
          this.executeNextClick(nextD);
        }, restDuration);
        
        return;
      }
      
      this.executeNextClick(d);
    }, d);
  }

  async executeNextClick(d) {
    if (this.isManuallyPaused) return;

    const x = generateRandomValue(this.options.xMin, this.options.xMax);
    const y = generateRandomValue(this.options.yMin, this.options.yMax);
    const nextD = this.options.dMax === 0 ? 
      0 : generateRandomValue(this.options.dMin, this.options.dMax);

    if (this.isManuallyPaused) return;

    const success = await this.shell.tap(x, y);

    if (this.isManuallyPaused) return;

    if (!success) {
      if (!this.restPaused && this.nextRestTime) {
        this.restPaused = true;
        this.restTimeRemaining = this.nextRestTime - Date.now();
        this.nextRestTime = null;
      }
      this.scheduleNextClick(DELAYS.RETRY_INTERVAL);
      return;
    }

    log(MESSAGES.CLICK_INFO(x, y, d));
    this.scheduleNextClick(nextD);
  }

  stop() {
    if (this.keyboard) {
      this.keyboard.stop();
      this.keyboard = null;
    }

    if (this.shell) {
      this.shell.cleanup();
      this.shell = null;
    }

    if (this.quitSignal) {
      this.quitSignal();
      this.quitSignal = null;
    }
  }
}

module.exports = Controller;
