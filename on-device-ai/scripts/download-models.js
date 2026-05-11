/**
 * PAYO On-Device AI - Model Downloader
 * Downloads STT (Whisper via QVAC) and QR models for offline use
 * 
 * Supports two engines:
 * 1. @qvac/sdk (Tether) - Primary, recommended
 * 2. @xenova/transformers - Fallback
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

/**
 * Try to download using @qvac/sdk first
 */
async function downloadWithQVAC() {
  log('info', 'Attempting to load model via @qvac/sdk (Tether)...');
  
  try {
    const { loadModel, unloadModel } = await import('@qvac/sdk');
    
    log('download', 'Loading QVAC Whisper model...');
    log('info', 'Model will be cached locally after first download.');
    
    const modelId = await loadModel({
      modelSrc: 'WHISPER_TINY',  // Multilingual, supports Indonesian
      modelType: 'stt',
    });
    
    log('ok', 'QVAC STT model loaded successfully!');
    log('info', `Model ID: ${modelId}`);
    
    // Unload to free memory (model stays cached)
    await unloadModel({ modelId });
    log('ok', 'Model cached for offline use.');
    
    return {
      success: true,
      engine: 'qvac',
      model: 'WHISPER_TINY'
    };
  } catch (error) {
    log('warn', `QVAC failed: ${error.message}`);
    log('info', 'Falling back to @xenova/transformers...');
    return { success: false };
  }
}

/**
 * Fallback to @xenova/transformers
 */
async function downloadWithTransformers() {
  log('info', 'Loading model via @xenova/transformers...');
  
  try {
    const { pipeline } = await import('@xenova/transformers');
    
    const defaultModel = config.stt.default;
    const modelInfo = config.stt.available.find(m => m.name === defaultModel);
    
    if (!modelInfo) {
      throw new Error(`Model ${defaultModel} not found in config`);
    }

    log('info', `Downloading STT model: ${modelInfo.name}`);
    log('info', `Size: ~${modelInfo.size}`);
    log('download', 'Starting download...');
    
    let lastProgress = 0;
    await pipeline(
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
    log('ok', `Transformers model downloaded: ${modelInfo.name}`);
    
    return {
      success: true,
      engine: 'transformers',
      model: modelInfo.name
    };
  } catch (error) {
    log('error', `Transformers failed: ${error.message}`);
    return { success: false };
  }
}

async function downloadSTTModel() {
  // Try QVAC first, then fallback to Transformers
  let result = await downloadWithQVAC();
  
  if (!result.success) {
    result = await downloadWithTransformers();
  }
  
  if (result.success) {
    // Save model info
    const modelDir = path.join(ROOT_DIR, config.paths.sttModels);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }
    
    const modelInfoPath = path.join(modelDir, 'model-info.json');
    fs.writeFileSync(modelInfoPath, JSON.stringify({
      name: result.model,
      engine: result.engine,
      downloadedAt: new Date().toISOString(),
      offline: true
    }, null, 2));
    
    return true;
  }
  
  return false;
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
      pointOfInitiation: '12',
      merchantCategoryCode: '5411',
      transactionCurrency: '360',
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
  console.log(`${colors.bold}${colors.blue}  Engines: @qvac/sdk (primary) + @xenova/transformers (fallback)${colors.reset}`);
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
    log('info', 'Models are now cached for 100% OFFLINE use.');
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
