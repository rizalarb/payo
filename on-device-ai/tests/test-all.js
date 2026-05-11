/**
 * PAYO On-Device AI - Test All
 * Run all tests for STT and QR engines
 */

import { testSTT } from './test-stt.js';
import { testQR } from './test-qr.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

async function main() {
  console.log('');
  console.log(`${colors.bold}${colors.blue}═════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}  PAYO On-Device AI - Test Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}═════════════════════════════════════════════════${colors.reset}`);
  console.log('');

  let allPassed = true;

  // Test QR Engine (no model download needed)
  console.log(`${colors.bold}[1/2] Testing QR Engine...${colors.reset}`);
  console.log('');
  const qrPassed = await testQR();
  allPassed = allPassed && qrPassed;
  console.log('');

  // Test STT Engine
  console.log(`${colors.bold}[2/2] Testing STT Engine...${colors.reset}`);
  console.log('');
  const sttPassed = await testSTT();
  allPassed = allPassed && sttPassed;
  console.log('');

  // Summary
  console.log(`${colors.bold}═════════════════════════════════════════════════${colors.reset}`);
  if (allPassed) {
    console.log(`${colors.green}${colors.bold}  ✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.red}${colors.bold}  ✗ Some tests failed${colors.reset}`);
  }
  console.log('');

  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error(`Test error: ${error.message}`);
  process.exit(1);
});
