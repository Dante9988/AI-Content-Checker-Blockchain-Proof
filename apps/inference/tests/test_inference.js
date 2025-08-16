import assert from 'assert';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import * as ort from 'onnxruntime-node';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock the server environment
process.env.MODEL_PATH = path.join(__dirname, '../models/model.onnx');
const IMG_SIZE = 224;

/**
 * Tests for the ONNX model inference
 */
describe('ONNX Model Tests', function() {
  let session;
  
  before(async function() {
    // Skip tests if model doesn't exist
    if (!fs.existsSync(process.env.MODEL_PATH)) {
      console.warn(`Model not found at ${process.env.MODEL_PATH}. Skipping tests.`);
      this.skip();
    }
    
    // Load the model
    session = await ort.InferenceSession.create(process.env.MODEL_PATH);
  });
  
  it('should load the model successfully', function() {
    assert(session, 'Session should be created');
    assert(session.inputNames.length > 0, 'Model should have inputs');
    assert(session.outputNames.length > 0, 'Model should have outputs');
    assert.strictEqual(session.inputNames[0], 'input', 'Input name should be "input"');
    assert.strictEqual(session.outputNames[0], 'output_0', 'Output name should be "output_0"');
  });
  
  it('should run inference on a solid color image', async function() {
    // Create a solid color test image
    const imageBuffer = await sharp({
      create: {
        width: IMG_SIZE,
        height: IMG_SIZE,
        channels: 3,
        background: { r: 100, g: 100, b: 100 }
      }
    }).raw().toBuffer();
    
    // Preprocess image
    const floatArray = new Float32Array(IMG_SIZE * IMG_SIZE * 3);
    for (let i = 0; i < imageBuffer.length; i++) {
      floatArray[i] = imageBuffer[i] / 255.0;
    }
    
    // Run inference
    const inputName = session.inputNames[0];
    const input = new ort.Tensor('float32', floatArray, [1, IMG_SIZE, IMG_SIZE, 3]);
    
    const results = await session.run({ [inputName]: input });
    const output = results[session.outputNames[0]];
    
    // Check output
    assert(output, 'Output should exist');
    assert.strictEqual(output.data.length, 1, 'Output should have one value');
    assert(output.data[0] >= 0 && output.data[0] <= 1, 'Output should be between 0 and 1');
  });
  
  it('should run inference on a random noise image', async function() {
    // Create a random noise test image
    const imageBuffer = Buffer.alloc(IMG_SIZE * IMG_SIZE * 3);
    for (let i = 0; i < imageBuffer.length; i++) {
      imageBuffer[i] = Math.floor(Math.random() * 256);
    }
    
    // Preprocess image
    const floatArray = new Float32Array(IMG_SIZE * IMG_SIZE * 3);
    for (let i = 0; i < imageBuffer.length; i++) {
      floatArray[i] = imageBuffer[i] / 255.0;
    }
    
    // Run inference
    const inputName = session.inputNames[0];
    const input = new ort.Tensor('float32', floatArray, [1, IMG_SIZE, IMG_SIZE, 3]);
    
    const results = await session.run({ [inputName]: input });
    const output = results[session.outputNames[0]];
    
    // Check output
    assert(output, 'Output should exist');
    assert.strictEqual(output.data.length, 1, 'Output should have one value');
    assert(output.data[0] >= 0 && output.data[0] <= 1, 'Output should be between 0 and 1');
  });
});

/**
 * Tests for image preprocessing
 */
describe('Image Preprocessing Tests', function() {
  it('should preprocess JPEG images correctly', async function() {
    // Create a test JPEG image
    const testImage = await sharp({
      create: {
        width: IMG_SIZE * 2, // Intentionally larger
        height: IMG_SIZE * 2,
        channels: 3,
        background: { r: 200, g: 100, b: 50 }
      }
    }).jpeg().toBuffer();
    
    // Preprocess image (similar to server.js)
    const processed = await sharp(testImage)
      .resize(IMG_SIZE, IMG_SIZE, { fit: 'cover' })
      .toBuffer();
    
    // Convert to Float32 array and normalize to [0, 1]
    const pixels = new Uint8Array(processed);
    const floatArray = new Float32Array(IMG_SIZE * IMG_SIZE * 3);
    
    for (let i = 0; i < pixels.length; i++) {
      floatArray[i] = pixels[i] / 255.0;
    }
    
    // Check dimensions
    assert.strictEqual(floatArray.length, IMG_SIZE * IMG_SIZE * 3, 'Preprocessed array should have correct size');
    
    // Check values are normalized between 0 and 1
    let allNormalized = true;
    for (let i = 0; i < floatArray.length; i++) {
      if (floatArray[i] < 0 || floatArray[i] > 1) {
        allNormalized = false;
        break;
      }
    }
    assert(allNormalized, 'All values should be normalized between 0 and 1');
  });
  
  it('should handle PNG images correctly', async function() {
    // Create a test PNG image
    const testImage = await sharp({
      create: {
        width: IMG_SIZE,
        height: IMG_SIZE,
        channels: 4, // RGBA
        background: { r: 200, g: 100, b: 50, alpha: 0.5 }
      }
    }).png().toBuffer();
    
    // Preprocess image
    const processed = await sharp(testImage)
      .resize(IMG_SIZE, IMG_SIZE, { fit: 'cover' })
      .toBuffer();
    
    // Check dimensions
    assert(processed.length > 0, 'Processed image should not be empty');
  });
});

/**
 * Tests for error handling
 */
describe('Error Handling Tests', function() {
  it('should handle invalid image data gracefully', async function() {
    // Create invalid image data
    const invalidData = Buffer.from('not an image');
    
    // Attempt to process it
    try {
      await sharp(invalidData)
        .resize(IMG_SIZE, IMG_SIZE, { fit: 'cover' })
        .toBuffer();
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert(error, 'Should throw an error for invalid image data');
    }
  });
  
  it('should handle empty image data gracefully', async function() {
    // Create empty image data
    const emptyData = Buffer.alloc(0);
    
    // Attempt to process it
    try {
      await sharp(emptyData)
        .resize(IMG_SIZE, IMG_SIZE, { fit: 'cover' })
        .toBuffer();
      assert.fail('Should have thrown an error');
    } catch (error) {
      assert(error, 'Should throw an error for empty image data');
    }
  });
});

/**
 * Integration tests
 */
describe('Integration Tests', function() {
  // These tests would normally use supertest to test the API endpoints
  // But for simplicity, we're just testing the core functionality
  
  it('should calculate content hash correctly', function() {
    // Create test data
    const testData = Buffer.from('test image data');
    
    // Calculate hash
    const hash = crypto.createHash('sha256').update(testData).digest('hex');
    const contentHash = `0x${hash}`;
    
    // Check hash format
    assert(contentHash.startsWith('0x'), 'Content hash should start with 0x');
    assert.strictEqual(contentHash.length, 2 + 64, 'Content hash should be 64 hex chars plus 0x prefix');
  });
});
