const express = require('express');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Config
const PORT = process.env.PORT || 3333;
const INSTANCE_KEY = process.env.INSTANCE_KEY || 'securedguard';
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, '..', 'sessions');

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

let qrString = null;
let ready = false;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: INSTANCE_KEY, dataPath: SESSION_DIR }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', (qr) => {
  qrString = qr;
  ready = false;
  console.log('QR code updated');
});

client.on('ready', () => {
  ready = true;
  console.log('WhatsApp client is ready');
});

client.on('disconnected', () => {
  ready = false;
  console.log('WhatsApp client disconnected');
});

// Start client immediately
client.initialize();

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ready });
});

// Init instance (no-op if running)
app.get('/instance/init', (req, res) => {
  res.json({ key: INSTANCE_KEY, status: 'initialized' });
});

// Connection state
app.get('/instance/connectionState', (req, res) => {
  res.json({ state: ready ? 'open' : 'closed' });
});

// QR code
app.get('/instance/qr', async (req, res) => {
  if (!qrString) return res.status(404).json({ message: 'QR not available' });
  const svg = await QRCode.toString(qrString, { type: 'svg' });
  res.type('image/svg+xml').send(svg);
});

// Logout
app.post('/instance/logout', async (req, res) => {
  try {
    await client.logout();
    ready = false;
    qrString = null;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Send text (Baileys REST compatible)
app.post('/message/text', async (req, res) => {
  try {
    const id = (req.body.id || '').trim();
    const message = (req.body.message || '').trim();
    if (!ready) return res.status(503).json({ success: false, error: 'Client not ready' });
    if (!id || !message) return res.status(400).json({ success: false, error: 'id and message required' });
    const jid = id.includes('@s.whatsapp.net') ? id : `${id.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await client.sendMessage(jid, message);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Send document/file (Baileys REST compatible: expects filepath)
app.post('/message/document', async (req, res) => {
  try {
    const id = (req.body.id || '').trim();
    const message = (req.body.message || '').trim();
    const filepath = (req.body.filepath || '').trim();
    if (!ready) return res.status(503).json({ success: false, error: 'Client not ready' });
    if (!id || !filepath) return res.status(400).json({ success: false, error: 'id and filepath required' });
    const jid = id.includes('@s.whatsapp.net') ? id : `${id.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    if (!fs.existsSync(filepath)) return res.status(404).json({ success: false, error: 'file not found' });
    const media = MessageMedia.fromFilePath(filepath);
    await client.sendMessage(jid, media, { caption: message || undefined });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp service running on port ${PORT}`);
});


