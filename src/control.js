const { log } = require('./log');
const { generateRandomValue } = require('./random');
const adb = require('./adb');

class Controller {
  constructor(options) {
    this.options = options;
    this.isManuallyPaused = false;
    this.currentTimeout = null;
    this.nextRestTime = null;
    this.restTimeRemaining = null;
    this.pauseStartTime = null;
    this.isDeviceDisconnected = false;
    this.restPaused = false;
    this.hasStarted = false;
  }

  setupKeyboardControl() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key) => {
      if (key === 'p' || key === 'P') {
        if (this.isManuallyPaused) {
          this.resumeFromManualPause();
        } else {
          this.pauseManually();
        }
      } else if (key === 'r' || key === 'R') {
        if (this.isManuallyPaused) {
          this.resumeFromManualPause();
        }
      } else if (key === '\u0003') { // Ctrl+C
        this.cleanup();
      }
    });
  }

  start() {
    this.scheduleNextRest();
    const initialDelay = this.options.dMax === 0 ? 
      0 : generateRandomValue(this.options.dMin, this.options.dMax);
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
    if (adb.isConnected()) {
      adb.tap(this.options.xMin, this.options.yMin);
    }
    log('操作已手动暂停，按 p 或 r 继续');
  }

  resumeFromManualPause() {
    this.isManuallyPaused = false;
    if (this.restTimeRemaining && this.restTimeRemaining > 0) {
      this.nextRestTime = Date.now() + this.restTimeRemaining;
      log(`自动休息计划将在 ${this.restTimeRemaining} ms 后休息`);
    }
    this.restTimeRemaining = null;
    this.pauseStartTime = null;
    log('操作已继续');
    const nextD = this.options.dMax === 0 ? 
      0 : generateRandomValue(this.options.dMin, this.options.dMax);
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
    log(`计划在 ${restInterval} ms 后自动休息`);
  }

  scheduleNextClick(d) {
    if (this.isManuallyPaused) return;

    this.currentTimeout = setTimeout(() => {
      this.currentTimeout = null;
      
      if (!adb.isConnected()) {
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
          log(`计划在 ${this.restTimeRemaining} ms 后自动休息`);
          this.restTimeRemaining = null;
        }
      }
      
      if (this.nextRestTime && Date.now() >= this.nextRestTime) {
        const restDuration = generateRandomValue(
          this.options.pauseDurationMin, 
          this.options.pauseDurationMax
        );
        log(`开始自动休息 ${restDuration} ms`);
        
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

    const success = await adb.tap(x, y);
    if (!success) {
      if (!this.restPaused && this.nextRestTime) {
        this.restPaused = true;
        this.restTimeRemaining = this.nextRestTime - Date.now();
        this.nextRestTime = null;
      }
      this.scheduleNextClick(1000);
      return;
    }

    log(`点击坐标: (${x}, ${y}), 下次点击间隔: ${d} ms`);
    this.scheduleNextClick(nextD);
  }

  cleanup() {
    adb.cleanup();
    process.exit();
  }
}

module.exports = Controller;
