const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('unique-names-generator'); // To generate unique session IDs

const app = express();
const PORT = process.env.PORT || 3000;

// To hold active browser sessions for each client
const sessions = {};

// Serve frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());  // to parse JSON bodies

// Test route
app.get('/test', (req, res) => {
  res.send('test worked!');
});

// Initialize the browser and page for rendering
const startBrowser = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  return { browser, page };
};

// Route to start browser session using GET arguments
app.get('/start', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Create a unique session ID for this client
  const sessionId = uuidv4();
  
  const { browser, page } = await startBrowser(url);
  
  // Store the session for later use
  sessions[sessionId] = { browser, page };

  res.json({ message: 'Browser session started', sessionId });
});

// Route to fetch screenshot using GET method for a specific session
app.get('/screenshot', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const { page } = sessions[sessionId];
  const screenshot = await page.screenshot({ encoding: 'base64' });
  res.json({ screenshot });
});

// Route to handle mouse and keyboard inputs using POST method for a specific session
app.post('/input', async (req, res) => {
  const { sessionId, event, data } = req.body;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const { page } = sessions[sessionId];

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

// Route to stop browser session for a specific session
app.get('/stop', (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  const { browser } = sessions[sessionId];
  browser.close();
  delete sessions[sessionId];

  res.json({ message: 'Session closed' });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on https://localhost:${PORT}`);
});
