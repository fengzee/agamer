const { ipcRenderer } = require('electron');
const { Screencap } = require('fadb');

document.getElementById('connect').addEventListener('click', async () => {
  const screencap = new Screencap();
  try {
    const imageBuffer = await screencap.capture();
    const canvas = document.getElementById('screen');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = URL.createObjectURL(new Blob([imageBuffer]));
  } catch (error) {
    console.error('Failed to capture screen:', error);
  }
});
