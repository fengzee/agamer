const { log } = require('./log');
const { generateRandomValue } = require('./random');
const { Shell } = require('fadb');
const { COMMANDS, MESSAGES } = require('./constants');

class Controller {
  constructor(options) {
    this.options = options;
    this.shell = null;
    this.isManuallyPaused = false;
    this.currentTimeout = null;
    this.nextRestTime = null;
    this.restTimeRemaining = null;
    this.pauseStartTime = null;
    this.isDeviceDisconnected = false;
    this.restPaused = false;
    this.hasStarted = false;
  }

  start() {
    this.initAdbShell();
    this.setupKeyboardControl();

    this.startClick();
  }

  initAdbShell() {
    this.shell = new Shell();
    
    this.shell.on('connected', () => {
      log(MESSAGES.SHELL_CONNECTED);
    });

    this.shell.on('disconnected', () => {
      log(MESSAGES.SHELL_DISCONNECTED);
    });

    this.shell.on('reconnecting', () => {
      log(MESSAGES.SHELL_RECONNECTING);
    });

    this.shell.init();
  }

  setupKeyboardControl() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      this.handleKeyPress(key);
    });
  }

  handleKeyPress(key) {
    if (COMMANDS.PAUSE.includes(key)) {
      this.handlePauseResume();
    } else if (COMMANDS.RESUME.includes(key)) {
      this.handleResume();
    } else if (COMMANDS.QUIT.includes(key)) {
      this.cleanup();
    }
  }

  handlePauseResume() {
    if (this.isManuallyPaused) {
      this.resumeFromManualPause();
    } else {
      this.pauseManually();
    }
  }

  handleResume() {
    if (this.isManuallyPaused) {
      this.resumeFromManualPause();
    }
  }

  startClick() {
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
    this.isManuallyPaused = false;
    if (this.restTimeRemaining && this.restTimeRemaining > 0) {
      this.nextRestTime = Date.now() + this.restTimeRemaining;
      log(MESSAGES.REST_PLAN(this.restTimeRemaining));
    }
    this.restTimeRemaining = null;
    this.pauseStartTime = null;
    log(MESSAGES.RESUMED);
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
        this.scheduleNextClick(1000);
        return;
      }

      if (!this.hasStarted) {
        this.hasStarted = true;
        this.executeNextClick(d);
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
      this.scheduleNextClick(1000);
      return;
    }

    log(MESSAGES.CLICK_INFO(x, y, d));
    this.scheduleNextClick(nextD);
  }

  cleanup() {
    if (this.shell) {
      this.shell.cleanup();
      this.shell = null;
    }
    log(MESSAGES.QUIT);
    process.exit();
  }
}

module.exports = Controller;
