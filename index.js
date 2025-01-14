const puppeteer = require('puppeteer');
const WebSocket = require('ws');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve WebSocket for streaming and input
const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
const wss = new WebSocket.Server({ server });

// Puppeteer setup
const startBrowser = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  return { browser, page };
};

wss.on('connection', async (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    if (data.type === 'start') {
      const { url } = data;
      const { browser, page } = await startBrowser(url);

      // Stream screenshots to client
      const interval = setInterval(async () => {
        if (ws.readyState === WebSocket.OPEN) {
          const screenshot = await page.screenshot({ encoding: 'base64' });
          ws.send(JSON.stringify({ type: 'image', screenshot }));
        } else {
          clearInterval(interval);
          await browser.close();
        }
      }, 100); // Stream at ~10 FPS

      // Handle user inputs
      ws.on('message', async (inputMessage) => {
        const inputData = JSON.parse(inputMessage);

        if (inputData.type === 'input') {
          const { event, data } = inputData;

          if (event === 'mousemove') {
            const { x, y } = data;
            await page.mouse.move(x, y);
          } else if (event === 'click') {
            const { x, y } = data;
            await page.mouse.click(x, y);
          } else if (event === 'keydown') {
            const { key } = data;
            await page.keyboard.down(key);
          } else if (event === 'keyup') {
            const { key } = data;
            await page.keyboard.up(key);
          }
        }
      });
    }
  });
});
