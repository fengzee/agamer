const { spawn } = require('child_process');

class Screencap {
  constructor() {}

  async capture() {
    return new Promise((resolve, reject) => {
      const process = spawn('adb', ['exec-out', 'screencap', '-p']);
      const chunks = [];

      process.stdout.on('data', (chunk) => {
        chunks.push(chunk);
      });

      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error('Screenshot failed'));
          return;
        }

        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });

      process.on('error', (err) => reject(err));
    });
  }

  async captureToFile(filepath) {
    const buffer = await this.capture();
    require('fs').writeFileSync(filepath, buffer);
  }
}

module.exports = Screencap;
