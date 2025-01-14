const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// Test route
app.get('/test', (req, res) => {
  res.send('test worked!');
});

// Initialize the browser and page for rendering
let browser;
let page;

const startBrowser = async (url) => {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
};

// POST API to start the browser session
app.post('/start', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  await startBrowser(url);
  res.json({ message: 'Browser session started' });
});

// POST API to get a screenshot
app.post('/screenshot', async (req, res) => {
  if (!page) {
    return res.status(400).json({ error: 'Browser session not started' });
  }
  const screenshot = await page.screenshot({ encoding: 'base64' });
  res.json({ screenshot });
});

// POST API to handle mouse events
app.post('/input', async (req, res) => {
  if (!page) {
    return res.status(400).json({ error: 'Browser session not started' });
  }

  const { event, data } = req.body;
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

  res.json({ message: 'Input event processed' });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on https://localhost:${PORT}`);
});
