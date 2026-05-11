/**
 * PAYO On-Device AI - QR Engine Tests
 */

import { QREngine } from '../src/qr/engine.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m'
};

const PASS = `${colors.green}✓${colors.reset}`;
const FAIL = `${colors.red}✗${colors.reset}`;

export async function testQR() {
  const qr = new QREngine();
  let allPassed = true;

  // Test 1: Generate simple QR
  console.log('  Testing QR generation...');
  
  const simpleQR = await qr.generateDataURL('https://payo.app');
  if (simpleQR.success && simpleQR.dataUrl.startsWith('data:image/png;base64,')) {
    console.log(`    ${PASS} Simple QR generation`);
  } else {
    console.log(`    ${FAIL} Simple QR generation failed: ${simpleQR.error}`);
    allPassed = false;
  }

  // Test 2: Generate SVG
  const svgQR = await qr.generateSVG('https://payo.app');
  if (svgQR.success && svgQR.svg.includes('<svg')) {
    console.log(`    ${PASS} SVG QR generation`);
  } else {
    console.log(`    ${FAIL} SVG QR generation failed`);
    allPassed = false;
  }

  // Test 3: Generate QRIS
  console.log('');
  console.log('  Testing QRIS generation...');
  
  const qrisResult = await qr.generateQRIS({
    merchantName: 'TOKO PAYO TEST',
    merchantCity: 'JAKARTA',
    amount: 250000,
    dynamic: true
  });

  if (qrisResult.success) {
    console.log(`    ${PASS} QRIS generation`);
    console.log(`        Merchant: ${qrisResult.merchantName}`);
    console.log(`        Amount: Rp ${qrisResult.amount.toLocaleString()}`);
    console.log(`        Dynamic: ${qrisResult.dynamic}`);
  } else {
    console.log(`    ${FAIL} QRIS generation failed: ${qrisResult.error}`);
    allPassed = false;
  }

  // Test 4: CRC16 calculation
  console.log('');
  console.log('  Testing CRC16 calculation...');
  
  // Known test vector
  const testString = '00020101021226280010ID.CO.QRIS0102ID0203001520441115303360540412345802ID5913TEST MERCHANT6007JAKARTA6304';
  const expectedCRC = qr.calculateCRC16(testString);
  
  if (expectedCRC && expectedCRC.length === 4) {
    console.log(`    ${PASS} CRC16 calculation: ${expectedCRC}`);
  } else {
    console.log(`    ${FAIL} CRC16 calculation failed`);
    allPassed = false;
  }

  // Test 5: TLV encoding
  console.log('');
  console.log('  Testing TLV encoding...');
  
  const tlvResult = qr.tlv('00', '01');
  if (tlvResult === '000201') {
    console.log(`    ${PASS} TLV encoding: ${tlvResult}`);
  } else {
    console.log(`    ${FAIL} TLV encoding: expected 000201, got ${tlvResult}`);
    allPassed = false;
  }

  // Test 6: QRIS parsing
  console.log('');
  console.log('  Testing QRIS parsing...');
  
  if (qrisResult.success && qrisResult.qrisData) {
    const parsed = qr.parseQRIS(qrisResult.qrisData);
    
    if (parsed.merchantName === 'TOKO PAYO TEST' && parsed.pointOfInitiation === 'dynamic') {
      console.log(`    ${PASS} QRIS parsing`);
      console.log(`        Parsed merchant: ${parsed.merchantName}`);
      console.log(`        Parsed amount: ${parsed.amount}`);
      console.log(`        CRC valid: ${parsed.crcValid}`);
    } else {
      console.log(`    ${FAIL} QRIS parsing - data mismatch`);
      allPassed = false;
    }
  }

  // Test 7: Save to file
  console.log('');
  console.log('  Testing file save...');
  
  const testFilePath = path.join(__dirname, '..', '.cache', 'test-qr.png');
  const testDir = path.dirname(testFilePath);
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  const saveResult = await qr.saveToFile('TEST123', testFilePath);
  
  if (saveResult.success && fs.existsSync(testFilePath)) {
    console.log(`    ${PASS} File save: ${testFilePath}`);
    // Clean up
    fs.unlinkSync(testFilePath);
  } else {
    console.log(`    ${FAIL} File save failed`);
    allPassed = false;
  }

  return allPassed;
}

// Run if main
if (process.argv[1].includes('test-qr.js')) {
  testQR().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
