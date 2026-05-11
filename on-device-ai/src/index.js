/**
 * PAYO On-Device AI - Main Entry Point
 * Unified API for STT and QR engines
 */

import { STTEngine } from './stt/engine.js';
import { QREngine } from './qr/engine.js';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Load config
const configPath = path.join(ROOT_DIR, 'config', 'models.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Initialize engines
const sttEngine = new STTEngine({
  modelName: `Xenova/whisper-${config.stt.default}`,
  language: config.stt.language
});

const qrEngine = new QREngine(config.qr);

// Setup Express server
const app = express();
const upload = multer({ dest: path.join(ROOT_DIR, '.cache', 'uploads') });

app.use(cors());
app.use(express.json());

// ============================================================
// API ROUTES
// ============================================================

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    engines: {
      stt: sttEngine.isReady(),
      qr: true
    }
  });
});

/**
 * STT: Transcribe audio
 * POST /api/stt/transcribe
 */
app.post('/api/stt/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const options = {
      language: req.body.language || config.stt.language,
      returnTimestamps: req.body.timestamps === 'true'
    };

    const result = await sttEngine.transcribe(req.file.path, options);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * STT: Parse voice command intent
 * POST /api/stt/parse-intent
 */
app.post('/api/stt/parse-intent', (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'No text provided' });
  }

  const intent = sttEngine.parseIntent(text);
  res.json(intent);
});

/**
 * STT: Load model
 * POST /api/stt/load-model
 */
app.post('/api/stt/load-model', async (req, res) => {
  try {
    const { model } = req.body;
    await sttEngine.loadModel(model || config.stt.default);
    res.json({
      success: true,
      model: sttEngine.getModelInfo()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * QR: Generate QRIS
 * POST /api/qr/qris
 */
app.post('/api/qr/qris', async (req, res) => {
  try {
    const {
      merchantName,
      merchantCity,
      amount,
      merchantId,
      terminalId,
      dynamic = true,
      format = 'dataurl'
    } = req.body;

    if (!merchantName) {
      return res.status(400).json({ error: 'merchantName is required' });
    }

    const qrisResult = await qrEngine.generateQRIS({
      merchantName,
      merchantCity,
      amount: parseInt(amount) || 0,
      merchantId,
      terminalId,
      dynamic
    });

    if (!qrisResult.success) {
      return res.status(500).json(qrisResult);
    }

    // Return as requested format
    if (format === 'dataurl') {
      const dataUrlResult = await qrEngine.generateDataURL(qrisResult.qrisData);
      res.json({
        ...qrisResult,
        buffer: undefined,
        dataUrl: dataUrlResult.dataUrl
      });
    } else if (format === 'png') {
      res.set('Content-Type', 'image/png');
      res.send(qrisResult.buffer);
    } else {
      res.json(qrisResult);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * QR: Generate generic QR
 * POST /api/qr/generate
 */
app.post('/api/qr/generate', async (req, res) => {
  try {
    const { data, format = 'dataurl' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data is required' });
    }

    let result;
    if (format === 'svg') {
      result = await qrEngine.generateSVG(data);
    } else if (format === 'dataurl') {
      result = await qrEngine.generateDataURL(data);
    } else {
      result = await qrEngine.generatePNG(data);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * QR: Decode/Scan QR from image
 * POST /api/qr/decode
 */
app.post('/api/qr/decode', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await qrEngine.decode(req.file.path);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 8080;

async function main() {
  console.log('');
  console.log('\x1b[34m\x1b[1m═════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[34m\x1b[1m  PAYO On-Device AI Server\x1b[0m');
  console.log('\x1b[34m\x1b[1m  STT + QR Engine | 100% Offline\x1b[0m');
  console.log('\x1b[34m\x1b[1m═════════════════════════════════════════════════\x1b[0m');
  console.log('');

  // Pre-load STT model
  console.log('[INIT] Loading STT model...');
  try {
    await sttEngine.loadModel();
    console.log('[INIT] STT model loaded successfully');
  } catch (error) {
    console.warn('[INIT] STT model will be loaded on first request');
  }

  // Create upload directory
  const uploadDir = path.join(ROOT_DIR, '.cache', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Start server
  app.listen(PORT, () => {
    console.log('');
    console.log(`\x1b[32m✓ Server running on http://localhost:${PORT}\x1b[0m`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST /api/stt/transcribe    - Transcribe audio to text');
    console.log('  POST /api/stt/parse-intent  - Parse voice command intent');
    console.log('  POST /api/qr/qris           - Generate QRIS code');
    console.log('  POST /api/qr/generate       - Generate generic QR');
    console.log('  POST /api/qr/decode         - Decode QR from image');
    console.log('  GET  /api/health            - Health check');
    console.log('');
  });
}

// Export for testing
export { sttEngine, qrEngine, app };

// Run if main
main().catch(console.error);
