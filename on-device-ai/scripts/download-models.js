/**
 * PAYO On-Device AI - Model Downloader
 * Downloads STT (Whisper) and QR models for offline use
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Load config
const configPath = path.join(ROOT_DIR, 'config', 'models.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

function log(type, message) {
  const prefix = {
    info: `${colors.blue}[INFO]${colors.reset}`,
    ok: `${colors.green}[OK]${colors.reset}`,
    warn: `${colors.yellow}[WARN]${colors.reset}`,
    error: `${colors.red}[ERROR]${colors.reset}`,
    download: `${colors.blue}[⬇]${colors.reset}`
  };
  console.log(`${prefix[type] || '[LOG]'} ${message}`);
}

async function downloadSTTModel() {
  const defaultModel = config.stt.default;
  const modelInfo = config.stt.available.find(m => m.name === defaultModel);
  
  if (!modelInfo) {
    log('error', `Model ${defaultModel} not found in config`);
    return false;
  }

  log('info', `Downloading STT model: ${modelInfo.name}`);
  log('info', `Size: ~${modelInfo.size}`);
  log('info', `From: ${modelInfo.huggingface}`);
  console.log('');

  try {
    // Create models directory if not exists
    const modelDir = path.join(ROOT_DIR, config.paths.sttModels);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    // Download using transformers.js pipeline
    // This will cache the model locally
    log('download', 'Starting download... (this may take a few minutes)');
    
    let lastProgress = 0;
    const transcriber = await pipeline(
      'automatic-speech-recognition',
      modelInfo.huggingface,
      {
        progress_callback: (data) => {
          if (data.status === 'progress' && data.total) {
            const progress = Math.round((data.loaded / data.total) * 100);
            if (progress !== lastProgress && progress % 10 === 0) {
              process.stdout.write(`\r${colors.blue}[⬇]${colors.reset} Downloading: ${progress}%`);
              lastProgress = progress;
            }
          }
        }
      }
    );

    console.log('');
    log('ok', `STT model downloaded: ${modelInfo.name}`);
    
    // Save model info
    const modelInfoPath = path.join(modelDir, 'model-info.json');
    fs.writeFileSync(modelInfoPath, JSON.stringify({
      name: modelInfo.name,
      huggingface: modelInfo.huggingface,
      downloadedAt: new Date().toISOString(),
      size: modelInfo.size
    }, null, 2));

    return true;
  } catch (error) {
    console.log('');
    log('error', `Failed to download STT model: ${error.message}`);
    return false;
  }
}

async function setupQRAssets() {
  log('info', 'Setting up QR assets...');
  
  try {
    const qrDir = path.join(ROOT_DIR, config.paths.qrAssets);
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    // Create QRIS config for Indonesia standard
    const qrisConfig = {
      version: '01',
      format: 'EMV-QRIS',
      pointOfInitiation: '12', // Dynamic QR
      merchantCategoryCode: '5411', // Grocery stores
      transactionCurrency: '360', // IDR
      countryCode: 'ID',
      crc: 'CRC16-CCITT-FALSE',
      createdAt: new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(qrDir, 'qris-config.json'),
      JSON.stringify(qrisConfig, null, 2)
    );

    log('ok', 'QR assets configured');
    return true;
  } catch (error) {
    log('error', `Failed to setup QR assets: ${error.message}`);
    return false;
  }
}

async function createCacheDir() {
  const cacheDir = path.join(ROOT_DIR, config.paths.cache);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    log('ok', 'Cache directory created');
  }
  return true;
}

async function main() {
  console.log('');
  console.log(`${colors.bold}${colors.blue}═════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}  PAYO - Downloading AI Models${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}═════════════════════════════════════════════════${colors.reset}`);
  console.log('');

  let success = true;

  // Create cache directory
  await createCacheDir();

  // Download STT model
  console.log(`${colors.bold}[1/2] STT Model (Speech-to-Text)${colors.reset}`);
  console.log('');
  const sttResult = await downloadSTTModel();
  success = success && sttResult;
  console.log('');

  // Setup QR assets
  console.log(`${colors.bold}[2/2] QR Engine Assets${colors.reset}`);
  console.log('');
  const qrResult = await setupQRAssets();
  success = success && qrResult;
  console.log('');

  // Summary
  console.log(`${colors.bold}═════════════════════════════════════════════════${colors.reset}`);
  if (success) {
    log('ok', 'All models downloaded successfully!');
    log('info', 'You can now run: npm start');
  } else {
    log('warn', 'Some downloads failed. You can retry with:');
    log('info', '  npm run download-models');
  }
  console.log('');

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  log('error', error.message);
  process.exit(1);
});
