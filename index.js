const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // To generate unique session IDs

const app = express();
const PORT = process.env.PORT || 3000;

// Store active sessions and pre-launched browser
const sessions = {};
let browser;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Launch the browser at startup
(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    console.log('Browser launched at server startup.');
  } catch (error) {
    console.error('Failed to launch browser:', error);
    process.exit(1);
  }
})();

// Test route
app.get('/test', (req, res) => {
  res.send('test worked!');
});

// Start a new session
app.get('/start', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Generate a unique session ID
    const sessionId = uuidv4();

    // Create a new page in the pre-launched browser
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Store session details
    sessions[sessionId] = { page };

    res.json({ message: 'Browser session started', sessionId });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Fetch screenshot for a specific session
app.get('/screenshot', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const { page } = sessions[sessionId];
    const screenshot = await page.screenshot({ encoding: 'base64' });
    res.json({ screenshot });
  } catch (error) {
    console.error('Error taking screenshot:', error);
    res.status(500).json({ error: 'Failed to take screenshot' });
  }
});

// Handle user input for a specific session
app.post('/input', async (req, res) => {
  const { sessionId, event, data } = req.body;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
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
  } catch (error) {
    console.error('Error processing input:', error);
    res.status(500).json({ error: 'Failed to process input' });
  }
});

// Stop a session
app.get('/stop', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId || !sessions[sessionId]) {
    return res.status(400).json({ error: 'Invalid session ID' });
  }

  try {
    const { page } = sessions[sessionId];
    await page.close();
    delete sessions[sessionId];

    res.json({ message: 'Session stopped' });
  } catch (error) {
    console.error('Error stopping session:', error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

// Shutdown handler to close the browser
process.on('SIGINT', async () => {
  console.log('Closing browser...');
  await browser.close();
  console.log('Browser closed.');
  process.exit(0);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
