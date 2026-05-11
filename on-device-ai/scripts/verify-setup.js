/**
 * PAYO On-Device AI - Setup Verification
 * Verifies that all components are properly installed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

const CHECKMARK = `${colors.green}✓${colors.reset}`;
const CROSSMARK = `${colors.red}✗${colors.reset}`;
const WARNING = `${colors.yellow}⚠${colors.reset}`;

function checkExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  const status = exists ? CHECKMARK : CROSSMARK;
  console.log(`  ${status} ${description}`);
  return exists;
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  const ok = major >= 20;
  const status = ok ? CHECKMARK : CROSSMARK;
  console.log(`  ${status} Node.js version: ${version} ${ok ? '' : '(requires v20+)'}`);
  return ok;
}

async function checkModule(moduleName) {
  try {
    await import(moduleName);
    console.log(`  ${CHECKMARK} Module: ${moduleName}`);
    return true;
  } catch {
    console.log(`  ${CROSSMARK} Module: ${moduleName} (not installed)`);
    return false;
  }
}

async function main() {
  console.log('');
  console.log(`${colors.bold}${colors.blue}Verifying PAYO On-Device AI Setup${colors.reset}`);
  console.log('');

  let allPassed = true;

  // 1. Check Node.js version
  console.log(`${colors.bold}[1] Runtime Environment${colors.reset}`);
  allPassed = checkNodeVersion() && allPassed;
  console.log('');

  // 2. Check required files
  console.log(`${colors.bold}[2] Required Files${colors.reset}`);
  allPassed = checkExists(path.join(ROOT_DIR, 'package.json'), 'package.json') && allPassed;
  allPassed = checkExists(path.join(ROOT_DIR, 'config', 'models.json'), 'config/models.json') && allPassed;
  allPassed = checkExists(path.join(ROOT_DIR, 'src', 'index.js'), 'src/index.js') && allPassed;
  console.log('');

  // 3. Check directories
  console.log(`${colors.bold}[3] Directory Structure${colors.reset}`);
  checkExists(path.join(ROOT_DIR, 'models', 'stt'), 'models/stt/');
  checkExists(path.join(ROOT_DIR, 'models', 'qr'), 'models/qr/');
  checkExists(path.join(ROOT_DIR, 'src', 'stt'), 'src/stt/');
  checkExists(path.join(ROOT_DIR, 'src', 'qr'), 'src/qr/');
  console.log('');

  // 4. Check critical npm modules
  console.log(`${colors.bold}[4] Core Dependencies${colors.reset}`);
  allPassed = await checkModule('@xenova/transformers') && allPassed;
  allPassed = await checkModule('onnxruntime-node') && allPassed;
  allPassed = await checkModule('qrcode') && allPassed;
  allPassed = await checkModule('jsqr') && allPassed;
  console.log('');

  // 5. Check model files
  console.log(`${colors.bold}[5] AI Models${colors.reset}`);
  const sttModelInfo = path.join(ROOT_DIR, 'models', 'stt', 'model-info.json');
  if (fs.existsSync(sttModelInfo)) {
    const info = JSON.parse(fs.readFileSync(sttModelInfo, 'utf-8'));
    console.log(`  ${CHECKMARK} STT Model: ${info.name} (${info.size})`);
  } else {
    console.log(`  ${WARNING} STT Model: Not downloaded yet`);
    console.log(`         Run: npm run download-models`);
  }
  
  const qrConfig = path.join(ROOT_DIR, 'models', 'qr', 'qris-config.json');
  if (fs.existsSync(qrConfig)) {
    console.log(`  ${CHECKMARK} QR Config: QRIS EMV standard`);
  } else {
    console.log(`  ${WARNING} QR Config: Not configured yet`);
  }
  console.log('');

  // Summary
  console.log(`${colors.bold}═════════════════════════════════════════════════${colors.reset}`);
  if (allPassed) {
    console.log(`${colors.green}${colors.bold}  ✓ All checks passed!${colors.reset}`);
    console.log(`${colors.green}    Ready to start: npm start${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${colors.bold}  ⚠ Some checks failed${colors.reset}`);
    console.log(`${colors.yellow}    Please fix the issues above${colors.reset}`);
  }
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error(`${colors.red}Verification error: ${error.message}${colors.reset}`);
  process.exit(1);
});
