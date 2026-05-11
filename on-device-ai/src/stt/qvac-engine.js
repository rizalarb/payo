/**
 * PAYO On-Device AI - STT Engine using @qvac/sdk
 * Speech-to-Text using Tether QVAC SDK (100% Offline)
 * 
 * @qvac/sdk provides:
 * - whisper.cpp based local inference
 * - Models download once, run offline forever
 * - Cross-platform: Windows, macOS, Linux, iOS, Android
 */

import { loadModel, speechToText, unloadModel } from '@qvac/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Available QVAC STT models
export const QVAC_MODELS = {
  WHISPER_TINY_EN: 'WHISPER_TINY_EN',       // ~39MB, fastest, English only
  WHISPER_TINY: 'WHISPER_TINY',             // ~39MB, multilingual
  WHISPER_BASE_EN: 'WHISPER_BASE_EN',       // ~74MB, better accuracy
  WHISPER_BASE: 'WHISPER_BASE',             // ~74MB, multilingual
  WHISPER_SMALL_EN: 'WHISPER_SMALL_EN',     // ~244MB, high accuracy
  WHISPER_SMALL: 'WHISPER_SMALL',           // ~244MB, multilingual
};

export class QVACSTTEngine {
  constructor(options = {}) {
    this.modelName = options.modelName || QVAC_MODELS.WHISPER_TINY;
    this.language = options.language || 'id'; // Default: Indonesian
    this.modelId = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  /**
   * Load the QVAC Whisper model into memory
   * Model will be downloaded on first use and cached locally
   */
  async loadModel(modelName = null) {
    if (modelName) {
      this.modelName = modelName;
    }

    // Prevent multiple loads
    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (this.isLoaded && this.modelId) {
      console.log(`[QVAC-STT] Model already loaded: ${this.modelName}`);
      return true;
    }

    console.log(`[QVAC-STT] Loading model: ${this.modelName}`);
    console.log(`[QVAC-STT] First load will download model (~39-244MB), then cached offline.`);

    this.loadPromise = (async () => {
      try {
        this.modelId = await loadModel({
          modelSrc: this.modelName,
          modelType: 'stt',
        });

        this.isLoaded = true;
        console.log(`[QVAC-STT] Model loaded successfully: ${this.modelName}`);
        console.log(`[QVAC-STT] Model ID: ${this.modelId}`);
        return true;
      } catch (error) {
        console.error(`[QVAC-STT] Failed to load model: ${error.message}`);
        this.loadPromise = null;
        throw error;
      }
    })();

    return this.loadPromise;
  }

  /**
   * Transcribe audio to text
   * @param {string|Buffer|Uint8Array} audio - Path to audio file or audio buffer
   * @param {Object} options - Transcription options
   */
  async transcribe(audio, options = {}) {
    if (!this.isLoaded || !this.modelId) {
      await this.loadModel();
    }

    const {
      language = this.language,
      stream = false,
    } = options;

    console.log(`[QVAC-STT] Transcribing... (language: ${language})`);
    const startTime = Date.now();

    try {
      // Read audio file if path is provided
      let audioBuffer;
      if (typeof audio === 'string') {
        audioBuffer = fs.readFileSync(audio);
      } else {
        audioBuffer = audio;
      }

      const result = await speechToText({
        modelId: this.modelId,
        audio: audioBuffer,
        inputType: 'audio',
        language: language,
        stream: stream,
      });

      const duration = Date.now() - startTime;
      console.log(`[QVAC-STT] Transcription complete in ${duration}ms`);

      return {
        success: true,
        text: result.text?.trim() || '',
        confidence: result.confidence || 0,
        durationMs: result.durationMs || duration,
        language: language,
        model: this.modelName,
        engine: 'qvac'
      };
    } catch (error) {
      console.error(`[QVAC-STT] Transcription failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        text: '',
        duration: Date.now() - startTime,
        engine: 'qvac'
      };
    }
  }

  /**
   * Streaming transcription for real-time use
   * @param {Buffer|Uint8Array} audioBuffer - Audio buffer
   * @param {Function} onChunk - Callback for each transcription chunk
   */
  async transcribeStream(audioBuffer, onChunk, options = {}) {
    if (!this.isLoaded || !this.modelId) {
      await this.loadModel();
    }

    const { language = this.language } = options;

    try {
      const result = speechToText({
        modelId: this.modelId,
        audio: audioBuffer,
        inputType: 'audio',
        language: language,
        stream: true,
      });

      let fullText = '';
      for await (const chunk of result.tokenStream) {
        fullText += chunk.text;
        if (onChunk) {
          onChunk({
            text: chunk.text,
            fullText: fullText,
            isFinal: chunk.isFinal || false
          });
        }
      }

      return {
        success: true,
        text: fullText.trim(),
        engine: 'qvac'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        engine: 'qvac'
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
          /kirim\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)\s+(?:ke\s+)?(.+)/i,
          /bayar\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)\s+(?:ke\s+)?(.+)/i
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
          /minta\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)/i
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
          /lihat\s+saldo/i,
          /saldo\s+saya/i
        ],
        extract: () => ({})
      },
      {
        intent: 'generate_qr',
        patterns: [
          /buat\s+qr(?:is)?\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)/i,
          /generate\s+qr(?:is)?\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)/i,
          /qr(?:is)?\s+(\d+(?:[.,]\d+)?(?:\s*(?:ribu|juta|rb|jt))?)/i
        ],
        extract: (match) => ({
          amount: this.parseAmount(match[1])
        })
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
            originalText: text,
            engine: 'qvac'
          };
        }
      }
    }

    // No match found
    return {
      intent: 'unknown',
      confidence: 0,
      params: {},
      originalText: text,
      engine: 'qvac'
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
   * Unload model to free memory
   */
  async unload() {
    if (this.modelId) {
      try {
        await unloadModel({ modelId: this.modelId });
        console.log(`[QVAC-STT] Model unloaded: ${this.modelName}`);
      } catch (error) {
        console.error(`[QVAC-STT] Failed to unload model: ${error.message}`);
      }
      this.modelId = null;
      this.isLoaded = false;
      this.loadPromise = null;
    }
  }

  /**
   * Check if model is loaded and ready
   */
  isReady() {
    return this.isLoaded && this.modelId !== null;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      modelName: this.modelName,
      modelId: this.modelId,
      isLoaded: this.isLoaded,
      defaultLanguage: this.language,
      engine: 'qvac',
      offline: true
    };
  }
}

export default QVACSTTEngine;
