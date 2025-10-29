const express = require('express');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Config
const PORT = process.env.PORT || 3333;
const INSTANCE_KEY = process.env.INSTANCE_KEY || 'securedguard';
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, '..', 'sessions');

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

const logger = P({ level: 'silent' });

let qrString = null;
let sock = null;
let ready = false;

async function connectToWhatsApp() {
  const authPath = path.join(SESSION_DIR, INSTANCE_KEY);
  if (!fs.existsSync(authPath)) fs.mkdirSync(authPath, { recursive: true });
  
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  
  // Usar versão hardcoded (fetchLatestBaileysVersion trava em algumas redes)
  const version = [2, 3000, 1017155907];
  console.log('✅ Usando versão estável do Baileys:', version);

  sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: state,
    browser: ['Chrome (Windows)', 'Chrome', '120.0.0.0'], // Simular Chrome real
    syncFullHistory: false,
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 60000,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    emitOwnEvents: true,
    fireInitQueries: true,
    generateHighQualityLinkPreview: false,
    getMessage: async () => undefined,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    console.log('Connection update:', JSON.stringify({ connection, qr: qr ? 'QR_AVAILABLE' : null, error: lastDisconnect?.error?.message }));
    
    if (qr) {
      qrString = qr;
      ready = false;
      console.log('QR code updated');
    }
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Status:', statusCode, 'Reconnect?', shouldReconnect);
      console.log('Error details:', lastDisconnect?.error);
      ready = false;
      qrString = null;
      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    } else if (connection === 'open') {
      ready = true;
      qrString = null;
      console.log('✅ WhatsApp connected and ready!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// Initialize connection
connectToWhatsApp().catch(err => {
  console.error('Failed to connect:', err);
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ready });
});

// Init instance
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
  try {
    const svg = await QRCode.toString(qrString, { type: 'svg' });
    res.type('image/svg+xml').send(svg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/instance/logout', async (req, res) => {
  try {
    if (sock) {
      await sock.logout();
      sock = null;
    }
    ready = false;
    qrString = null;
    const authPath = path.join(SESSION_DIR, INSTANCE_KEY);
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Send text message
app.post('/message/text', async (req, res) => {
  try {
    const id = (req.body.id || '').trim();
    const message = (req.body.message || '').trim();
    
    if (!ready || !sock) {
      return res.status(503).json({ success: false, error: 'Client not ready' });
    }
    
    if (!id || !message) {
      return res.status(400).json({ success: false, error: 'id and message required' });
    }
    
    const jid = id.includes('@s.whatsapp.net') ? id : `${id.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    
    await sock.sendMessage(jid, { text: message });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Send document/file
app.post('/message/document', async (req, res) => {
  try {
    const id = (req.body.id || '').trim();
    const message = (req.body.message || '').trim();
    const filepath = (req.body.filepath || '').trim();
    
    if (!ready || !sock) {
      return res.status(503).json({ success: false, error: 'Client not ready' });
    }
    
    if (!id || !filepath) {
      return res.status(400).json({ success: false, error: 'id and filepath required' });
    }
    
    const jid = id.includes('@s.whatsapp.net') ? id : `${id.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ success: false, error: 'file not found' });
    }
    
    const fileBuffer = fs.readFileSync(filepath);
    const fileName = path.basename(filepath);
    
    await sock.sendMessage(jid, {
      document: fileBuffer,
      fileName: fileName,
      mimetype: 'application/pdf',
      caption: message || undefined
    });
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp service running on port ${PORT}`);
});
