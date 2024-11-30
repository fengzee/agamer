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
    this.currentRestEndTime = null;
    this.isInRest = false;
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
    this.scheduleNextClick();
  }

  pauseManually() {
    this.isManuallyPaused = true;
    this.pauseStartTime = Date.now();

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    if (this.currentRestEndTime) {
      this.restTimeRemaining = this.currentRestEndTime - Date.now();
      this.currentRestEndTime = null;
      this.isInRest = true;
    } else if (this.nextRestTime) {
      this.restTimeRemaining = this.nextRestTime - Date.now();
      this.nextRestTime = null;
      this.isInRest = false;
    }

    log(MESSAGES.PAUSED);
  }

  resumeFromManualPause() {
    log(MESSAGES.RESUMED);
    this.isManuallyPaused = false;

    if (this.restTimeRemaining) {
      if (this.isInRest) {
        const originalRestEndTime = this.pauseStartTime + this.restTimeRemaining;
        
        if (Date.now() >= originalRestEndTime) {
          this.restTimeRemaining = null;
          this.currentRestEndTime = null;
          this.isInRest = false;
          this.scheduleNextRest();
          this.scheduleNextClick();
        } else {
          const remainingRestTime = originalRestEndTime - Date.now();
          this.currentRestEndTime = originalRestEndTime;
          log(MESSAGES.REST_CONTINUE(remainingRestTime));
          
          this.currentTimeout = setTimeout(() => {
            this.currentTimeout = null;
            this.currentRestEndTime = null;
            this.isInRest = false;
            this.scheduleNextRest();
            this.scheduleNextClick();
          }, remainingRestTime);
        }
      } else {
        this.nextRestTime = Date.now() + this.restTimeRemaining;
        log(MESSAGES.REST_PLAN(this.restTimeRemaining));
        this.scheduleNextClick();
      }
    } else {
      this.scheduleNextClick();
    }

    this.restTimeRemaining = null;
    this.pauseStartTime = null;
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

  scheduleNextClick(delay = null) {
    if (this.isManuallyPaused) return;

    const d = delay ?? generateRandomValue(this.options.dMin, this.options.dMax);

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
      
      if (this.currentRestEndTime && Date.now() < this.currentRestEndTime) {
        const remainingRestTime = this.currentRestEndTime - Date.now();
        this.currentTimeout = setTimeout(() => {
          this.currentTimeout = null;
          this.currentRestEndTime = null;
          this.scheduleNextRest();
          this.scheduleNextClick();
        }, remainingRestTime);
        return;
      }
      
      if (this.nextRestTime && Date.now() >= this.nextRestTime) {
        const restDuration = generateRandomValue(
          this.options.pauseDurationMin, 
          this.options.pauseDurationMax
        );
        log(MESSAGES.REST_START(restDuration));
        
        this.currentRestEndTime = Date.now() + restDuration;
        this.isInRest = true;
        this.currentTimeout = setTimeout(() => {
          this.currentTimeout = null;
          this.currentRestEndTime = null;
          this.isInRest = false;
          this.scheduleNextRest();
          this.scheduleNextClick();
        }, restDuration);
        
        return;
      }
      
      this.executeNextClick(d);
    }, d);
  }

  async executeNextClick(delay) {
    if (this.isManuallyPaused) return;

    const x = generateRandomValue(this.options.xMin, this.options.xMax);
    const y = generateRandomValue(this.options.yMin, this.options.yMax);

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

    log(MESSAGES.CLICK_INFO(x, y, delay));
    this.scheduleNextClick();
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

  togglePause() {
    if (this.isManuallyPaused) {
      this.resumeFromManualPause();
    } else {
      this.pauseManually();
    }
  }
}

module.exports = Controller;
