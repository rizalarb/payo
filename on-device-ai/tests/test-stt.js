/**
 * PAYO On-Device AI - STT Engine Tests
 */

import { STTEngine } from '../src/stt/engine.js';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

const PASS = `${colors.green}✓${colors.reset}`;
const FAIL = `${colors.red}✗${colors.reset}`;
const SKIP = `${colors.yellow}○${colors.reset}`;

export async function testSTT() {
  const stt = new STTEngine();
  let allPassed = true;

  // Test 1: Intent parsing - Transfer
  console.log('  Testing intent parsing...');
  
  const testCases = [
    {
      input: 'transfer 250 ribu ke Andi',
      expectedIntent: 'transfer',
      expectedAmount: 250000,
      expectedRecipient: 'Andi'
    },
    {
      input: 'kirim 1.5 juta ke Budi',
      expectedIntent: 'transfer',
      expectedAmount: 1500000,
      expectedRecipient: 'Budi'
    },
    {
      input: 'terima 500 ribu',
      expectedIntent: 'receive',
      expectedAmount: 500000
    },
    {
      input: 'tarik 2 juta ke BCA',
      expectedIntent: 'withdraw',
      expectedAmount: 2000000
    },
    {
      input: 'cek saldo',
      expectedIntent: 'check_balance'
    }
  ];

  for (const tc of testCases) {
    const result = stt.parseIntent(tc.input);
    const passed = result.intent === tc.expectedIntent &&
      (tc.expectedAmount === undefined || result.params.amount === tc.expectedAmount);
    
    if (passed) {
      console.log(`    ${PASS} "${tc.input}" -> ${result.intent}`);
    } else {
      console.log(`    ${FAIL} "${tc.input}" -> got ${result.intent}, expected ${tc.expectedIntent}`);
      allPassed = false;
    }
  }

  // Test 2: Amount parsing
  console.log('');
  console.log('  Testing amount parsing...');
  
  const amountTests = [
    { input: '250 ribu', expected: 250000 },
    { input: '1.5 juta', expected: 1500000 },
    { input: '500rb', expected: 500000 },
    { input: '2jt', expected: 2000000 },
    { input: '100000', expected: 100000 }
  ];

  for (const tc of amountTests) {
    const result = stt.parseAmount(tc.input);
    if (result === tc.expected) {
      console.log(`    ${PASS} "${tc.input}" -> ${result}`);
    } else {
      console.log(`    ${FAIL} "${tc.input}" -> got ${result}, expected ${tc.expected}`);
      allPassed = false;
    }
  }

  // Test 3: Model loading (skip if no internet/model)
  console.log('');
  console.log('  Testing model info...');
  
  const modelInfo = stt.getModelInfo();
  if (modelInfo.modelName) {
    console.log(`    ${PASS} Model name: ${modelInfo.modelName}`);
  } else {
    console.log(`    ${FAIL} Model name not set`);
    allPassed = false;
  }

  return allPassed;
}

// Run if main
if (process.argv[1].includes('test-stt.js')) {
  testSTT().then(passed => {
    process.exit(passed ? 0 : 1);
  });
}
