const express = require('express');
const axios = require('axios');
const cors = require('cors');
const useragent = require('useragent');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- Redirection Route (The Link Logger) ---
app.get('/l/:slug', async (req, res) => {
  const { slug } = req.params;
  const session = await db.prepare('SELECT * FROM sessions WHERE slug = ?').get(slug);

  if (!session) return res.status(404).send('Not Found');

  const agent = useragent.parse(req.headers['user-agent']);
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes('::ffff:')) ip = ip.split(':').reverse()[0];
  const referrer = req.headers['referer'] || 'Direct';

  const logRequest = async () => {
    let geo = { country: 'Unknown', city: 'Unknown' };
    try {
      if (ip !== '127.0.0.1' && ip !== '::1') {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        if (response.data.status === 'success') {
          geo = { country: response.data.country, city: response.data.city };
        }
      }
    } catch (err) { }

    await db.prepare(`
      INSERT INTO logs (session_id, ip_address, user_agent, browser, os, device, referrer, country, city)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.id, ip, req.headers['user-agent'], agent.toAgent(), agent.os.toString(), agent.device.toString(), referrer, geo.country, geo.city);
  };

  logRequest();

  if (session.target_url) {
    res.redirect(session.target_url);
  } else {
    res.send('<h1>Page Not Found</h1>');
  }
});

// --- Image Tracking Route (The Pixel Logger) ---
app.get('/i/:slug', async (req, res) => {
  const { slug } = req.params;
  const session = await db.prepare('SELECT * FROM sessions WHERE slug = ?').get(slug);

  if (!session) return res.status(404).send('Not Found');

  const agent = useragent.parse(req.headers['user-agent']);
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (ip.includes('::ffff:')) ip = ip.split(':').reverse()[0];
  const referrer = req.headers['referer'] || 'Direct';

  const logRequest = async () => {
    let geo = { country: 'Unknown', city: 'Unknown' };
    try {
      if (ip !== '127.0.0.1' && ip !== '::1') {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        if (response.data.status === 'success') {
          geo = { country: response.data.country, city: response.data.city };
        }
      }
    } catch (err) { }

    await db.prepare(`
      INSERT INTO logs (session_id, ip_address, user_agent, browser, os, device, referrer, country, city)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(session.id, ip, req.headers['user-agent'], agent.toAgent(), agent.os.toString(), agent.device.toString(), referrer, geo.country, geo.city);
  };

  logRequest();

  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(pixel);
});

// --- Admin API ---

app.get('/api/sessions', async (req, res) => {
  const query = db.isPostgres ? 
    `SELECT s.*, (SELECT COUNT(*) FROM logs l WHERE l.session_id = s.id) as click_count FROM sessions s ORDER BY s.created_at DESC` :
    `SELECT s.*, COUNT(l.id) as click_count FROM sessions s LEFT JOIN logs l ON s.id = l.session_id GROUP BY s.id ORDER BY s.created_at DESC`;
  
  const sessions = await db.prepare(query).all();
  res.json(sessions);
});

app.post('/api/sessions', async (req, res) => {
  const { name, target_url } = req.body;
  const slug = uuidv4().slice(0, 8);
  
  const result = await db.prepare('INSERT INTO sessions (slug, name, target_url) VALUES (?, ?, ?) RETURNING id').run(slug, name, target_url);
  const id = db.isPostgres ? result.rows[0].id : result.lastInsertRowid;
  const newSession = await db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  
  res.json(newSession);
});

app.get('/api/logs/:sessionId', async (req, res) => {
  const logs = await db.prepare('SELECT * FROM logs WHERE session_id = ? ORDER BY timestamp DESC').all(req.params.sessionId);
  res.json(logs);
});

app.delete('/api/sessions/:id', async (req, res) => {
  await db.prepare('DELETE FROM logs WHERE session_id = ?').run(req.params.id);
  await db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
