/**
 * PAYO On-Device AI - QR Engine
 * QR Code Generation & Scanning (QRIS Compliant)
 */

import QRCode from 'qrcode';
import Jimp from 'jimp';
import jsQR from 'jsqr';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class QREngine {
  constructor(options = {}) {
    this.errorCorrection = options.errorCorrection || 'M';
    this.margin = options.margin || 4;
    this.scale = options.scale || 4;
    this.color = options.color || {
      dark: '#000000',
      light: '#FFFFFF'
    };
  }

  /**
   * Generate QR Code as PNG buffer
   * @param {string} data - Data to encode
   * @param {Object} options - QR options
   */
  async generatePNG(data, options = {}) {
    const qrOptions = {
      errorCorrectionLevel: options.errorCorrection || this.errorCorrection,
      margin: options.margin || this.margin,
      scale: options.scale || this.scale,
      color: options.color || this.color,
      type: 'png'
    };

    try {
      const buffer = await QRCode.toBuffer(data, qrOptions);
      return {
        success: true,
        buffer,
        format: 'png',
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR Code as Data URL (base64)
   * @param {string} data - Data to encode
   * @param {Object} options - QR options
   */
  async generateDataURL(data, options = {}) {
    const qrOptions = {
      errorCorrectionLevel: options.errorCorrection || this.errorCorrection,
      margin: options.margin || this.margin,
      scale: options.scale || this.scale,
      color: options.color || this.color,
      type: 'image/png'
    };

    try {
      const dataUrl = await QRCode.toDataURL(data, qrOptions);
      return {
        success: true,
        dataUrl,
        format: 'dataurl',
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR Code as SVG
   * @param {string} data - Data to encode
   * @param {Object} options - QR options
   */
  async generateSVG(data, options = {}) {
    const qrOptions = {
      errorCorrectionLevel: options.errorCorrection || this.errorCorrection,
      margin: options.margin || this.margin,
      color: options.color || this.color,
      type: 'svg'
    };

    try {
      const svg = await QRCode.toString(data, qrOptions);
      return {
        success: true,
        svg,
        format: 'svg',
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QRIS (Indonesian QR Standard) Code
   * @param {Object} params - QRIS parameters
   */
  async generateQRIS(params) {
    const {
      merchantName,
      merchantCity = 'JAKARTA',
      amount = 0,
      merchantId = '',
      terminalId = '',
      dynamic = true,
      expiryMinutes = 15
    } = params;

    // Build QRIS EMV data string
    const qrisData = this.buildQRISData({
      merchantName,
      merchantCity,
      amount,
      merchantId,
      terminalId,
      dynamic
    });

    // Generate QR
    const result = await this.generatePNG(qrisData, {
      errorCorrection: 'M',
      scale: 6,
      margin: 2
    });

    if (result.success) {
      return {
        ...result,
        qrisData,
        merchantName,
        amount,
        dynamic,
        expiresAt: dynamic 
          ? new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
          : null
      };
    }

    return result;
  }

  /**
   * Build QRIS EMV format data string
   * Based on EMV QR Code Specification
   */
  buildQRISData(params) {
    const {
      merchantName,
      merchantCity,
      amount,
      merchantId,
      terminalId,
      dynamic
    } = params;

    const fields = [];

    // Payload Format Indicator (ID 00)
    fields.push(this.tlv('00', '01'));

    // Point of Initiation (ID 01)
    // 11 = Static, 12 = Dynamic
    fields.push(this.tlv('01', dynamic ? '12' : '11'));

    // Merchant Account Information (ID 26-51)
    // Using ID 26 for domestic transactions
    const merchantAccountInfo = [
      this.tlv('00', 'ID.CO.QRIS.WWW'), // Globally Unique Identifier
      this.tlv('01', merchantId || 'MERCHANT123'),
      this.tlv('02', terminalId || 'TERM001')
    ].join('');
    fields.push(this.tlv('26', merchantAccountInfo));

    // Merchant Category Code (ID 52)
    fields.push(this.tlv('52', '5411')); // Grocery stores

    // Transaction Currency (ID 53)
    fields.push(this.tlv('53', '360')); // IDR

    // Transaction Amount (ID 54) - only for dynamic QR
    if (dynamic && amount > 0) {
      fields.push(this.tlv('54', amount.toString()));
    }

    // Country Code (ID 58)
    fields.push(this.tlv('58', 'ID'));

    // Merchant Name (ID 59)
    fields.push(this.tlv('59', merchantName.substring(0, 25).toUpperCase()));

    // Merchant City (ID 60)
    fields.push(this.tlv('60', merchantCity.substring(0, 15).toUpperCase()));

    // Additional Data (ID 62)
    const additionalData = this.tlv('05', `INV${Date.now()}`); // Reference label
    fields.push(this.tlv('62', additionalData));

    // Join all fields
    let qrisString = fields.join('');

    // Add CRC placeholder (ID 63)
    qrisString += '6304';

    // Calculate CRC16-CCITT-FALSE
    const crc = this.calculateCRC16(qrisString);
    qrisString = qrisString.slice(0, -4) + this.tlv('63', crc);

    return qrisString;
  }

  /**
   * Create TLV (Tag-Length-Value) field
   */
  tlv(tag, value) {
    const length = value.length.toString().padStart(2, '0');
    return `${tag}${length}${value}`;
  }

  /**
   * Calculate CRC16-CCITT-FALSE checksum
   */
  calculateCRC16(str) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < str.length; i++) {
      const byte = str.charCodeAt(i);
      crc ^= (byte << 8);

      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ polynomial) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Decode QR Code from image file
   * @param {string|Buffer} input - Path to image or image buffer
   */
  async decode(input) {
    try {
      let image;

      if (typeof input === 'string') {
        // Load from file path
        image = await Jimp.read(input);
      } else if (Buffer.isBuffer(input)) {
        // Load from buffer
        image = await Jimp.read(input);
      } else {
        throw new Error('Input must be a file path or Buffer');
      }

      // Get image data
      const { width, height, data } = image.bitmap;

      // Convert to Uint8ClampedArray for jsQR
      const imageData = new Uint8ClampedArray(data);

      // Decode QR
      const code = jsQR(imageData, width, height);

      if (code) {
        const decoded = {
          success: true,
          data: code.data,
          location: code.location
        };

        // Try to parse QRIS data
        if (code.data.startsWith('00')) {
          decoded.qris = this.parseQRIS(code.data);
        }

        return decoded;
      }

      return {
        success: false,
        error: 'No QR code found in image'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Parse QRIS data string
   */
  parseQRIS(qrisString) {
    const result = {
      raw: qrisString,
      fields: {}
    };

    let pos = 0;
    while (pos < qrisString.length - 4) { // -4 for CRC
      const tag = qrisString.substring(pos, pos + 2);
      const length = parseInt(qrisString.substring(pos + 2, pos + 4));
      const value = qrisString.substring(pos + 4, pos + 4 + length);

      result.fields[tag] = value;
      pos += 4 + length;
    }

    // Extract common fields
    result.payloadFormat = result.fields['00'];
    result.pointOfInitiation = result.fields['01'] === '12' ? 'dynamic' : 'static';
    result.merchantCategoryCode = result.fields['52'];
    result.currency = result.fields['53'] === '360' ? 'IDR' : result.fields['53'];
    result.amount = result.fields['54'] ? parseInt(result.fields['54']) : null;
    result.countryCode = result.fields['58'];
    result.merchantName = result.fields['59'];
    result.merchantCity = result.fields['60'];
    result.crc = result.fields['63'];

    // Verify CRC
    const dataWithoutCRC = qrisString.slice(0, -4);
    const calculatedCRC = this.calculateCRC16(dataWithoutCRC + '6304');
    result.crcValid = calculatedCRC === result.crc;

    return result;
  }

  /**
   * Save QR Code to file
   */
  async saveToFile(data, filePath, options = {}) {
    const format = path.extname(filePath).toLowerCase().slice(1);

    let result;
    if (format === 'svg') {
      result = await this.generateSVG(data, options);
      if (result.success) {
        fs.writeFileSync(filePath, result.svg);
      }
    } else {
      result = await this.generatePNG(data, options);
      if (result.success) {
        fs.writeFileSync(filePath, result.buffer);
      }
    }

    return {
      ...result,
      filePath
    };
  }
}

export default QREngine;
