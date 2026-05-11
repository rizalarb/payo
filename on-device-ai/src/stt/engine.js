/**
 * PAYO On-Device AI - STT Engine
 * Speech-to-Text using Whisper ONNX (100% Offline)
 */

import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class STTEngine {
  constructor(options = {}) {
    this.modelName = options.modelName || 'Xenova/whisper-tiny';
    this.language = options.language || 'id'; // Default: Indonesian
    this.transcriber = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * Load the Whisper model into memory
   * @param {Function} progressCallback - Optional callback for download progress
   */
  async loadModel(modelName = null, progressCallback = null) {
    if (modelName) {
      this.modelName = modelName.includes('/') 
        ? modelName 
        : `Xenova/whisper-${modelName}`;
    }

    // Prevent multiple loads
    if (this.loadPromise) {
      return this.loadPromise;
    }

    console.log(`[STT] Loading model: ${this.modelName}`);

    this.loadPromise = (async () => {
      try {
        this.transcriber = await pipeline(
          'automatic-speech-recognition',
          this.modelName,
          {
            progress_callback: (data) => {
              if (data.status === 'progress' && progressCallback) {
                progressCallback({
                  status: 'progress',
                  progress: Math.round((data.loaded / data.total) * 100),
                  loaded: data.loaded,
                  total: data.total
                });
              }
            }
          }
        );

        this.isLoaded = true;
        console.log(`[STT] Model loaded successfully: ${this.modelName}`);
        return true;
      } catch (error) {
        console.error(`[STT] Failed to load model: ${error.message}`);
        this.loadPromise = null;
        throw error;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Transcribe audio file to text
   * @param {string|Float32Array} audio - Path to audio file or audio buffer
   * @param {Object} options - Transcription options
   */
  async transcribe(audio, options = {}) {
    if (!this.isLoaded) {
      await this.loadModel();
    }

    const {
      language = this.language,
      chunkLengthS = 30,
      returnTimestamps = false,
      task = 'transcribe' // or 'translate'
    } = options;

    console.log(`[STT] Transcribing... (language: ${language})`);
    const startTime = Date.now();

    try {
      const result = await this.transcriber(audio, {
        language,
        task,
        chunk_length_s: chunkLengthS,
        return_timestamps: returnTimestamps
      });

      const duration = Date.now() - startTime;
      console.log(`[STT] Transcription complete in ${duration}ms`);

      return {
        success: true,
        text: result.text.trim(),
        chunks: result.chunks || [],
        language: language,
        duration: duration,
        model: this.modelName
      };
    } catch (error) {
      console.error(`[STT] Transcription failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        text: '',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Parse Indonesian voice command for POS intents
   * @param {string} text - Transcribed text
   */
  parseIntent(text) {
    const normalizedText = text.toLowerCase().trim();
    
    // Intent patterns for Indonesian POS commands
    const patterns = [
      {
        intent: 'transfer',
        patterns: [
          /transfer\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)\s+(?:ke\s+)?(.+)/i,
          /kirim\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)\s+(?:ke\s+)?(.+)/i
        ],
        extract: (match) => ({
          amount: this.parseAmount(match[1]),
          recipient: match[2].trim()
        })
      },
      {
        intent: 'receive',
        patterns: [
          /terima\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)/i,
          /bayar\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)/i
        ],
        extract: (match) => ({
          amount: this.parseAmount(match[1])
        })
      },
      {
        intent: 'withdraw',
        patterns: [
          /tarik\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)\s+(?:ke\s+)?(.+)/i,
          /withdraw\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)\s+(?:ke\s+)?(.+)/i
        ],
        extract: (match) => ({
          amount: this.parseAmount(match[1]),
          bankAccount: match[2].trim()
        })
      },
      {
        intent: 'check_balance',
        patterns: [
          /cek\s+saldo/i,
          /berapa\s+saldo/i,
          /lihat\s+saldo/i
        ],
        extract: () => ({})
      }
    ];

    // Try to match patterns
    for (const { intent, patterns: intentPatterns, extract } of patterns) {
      for (const pattern of intentPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          return {
            intent,
            confidence: 0.9,
            params: extract(match),
            originalText: text
          };
        }
      }
    }

    // No match found
    return {
      intent: 'unknown',
      confidence: 0,
      params: {},
      originalText: text
    };
  }

  /**
   * Parse Indonesian amount strings (e.g., "250 ribu", "1.5 juta")
   */
  parseAmount(amountStr) {
    let amountLower = amountStr.toLowerCase().trim();
    
    // Extract numeric part (including decimals)
    let numericPart = amountLower
      .replace(/ribu|rb|juta|jt/gi, '')
      .replace(/\s+/g, '')
      .replace(/,/g, '.');  // Normalize comma to dot
    
    // Parse as float to handle decimals
    let numValue = parseFloat(numericPart) || 0;

    // Handle "ribu" (thousand)
    if (amountLower.includes('ribu') || amountLower.includes('rb')) {
      return Math.round(numValue * 1000);
    }

    // Handle "juta" (million)
    if (amountLower.includes('juta') || amountLower.includes('jt')) {
      return Math.round(numValue * 1000000);
    }

    return Math.round(numValue);
  }

  /**
   * Check if model is loaded
   */
  isReady() {
    return this.isLoaded;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      modelName: this.modelName,
      isLoaded: this.isLoaded,
      defaultLanguage: this.language
    };
  }
}

export default STTEngine;
