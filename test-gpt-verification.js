#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/verify';
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:3001/infer';

// Helper function for colored console output
function print(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Generate a fake image as base64
function generateFakeImageBase64() {
  // Create a simple pattern that will always be detected as fake
  // This is a 10x10 red square
  const width = 224;
  const height = 224;
  const channels = 3; // RGB
  const buffer = Buffer.alloc(width * height * channels);
  
  // Fill with a pattern (red background)
  for (let i = 0; i < buffer.length; i += channels) {
    buffer[i] = 255;     // R
    buffer[i + 1] = 0;   // G
    buffer[i + 2] = 0;   // B
  }
  
  // Add some text-like patterns that might trigger AI detection
  // Draw some lines
  for (let y = 50; y < 150; y++) {
    for (let x = 50; x < 150; x++) {
      const pos = (y * width + x) * channels;
      buffer[pos] = 0;     // R
      buffer[pos + 1] = 0; // G
      buffer[pos + 2] = 0; // B
    }
  }
  
  return buffer.toString('base64');
}

// Test the inference service directly
async function testInferenceService(base64Image) {
  print(colors.bright, '\n=== Testing Inference Service Directly ===');
  
  try {
    const startTime = Date.now();
    print(colors.blue, `Sending request to ${INFERENCE_URL}`);
    
    const response = await fetch(INFERENCE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Image })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Inference failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    print(colors.green, 'Inference successful!');
    print(colors.cyan, `Content Hash: ${result.contentHash}`);
    print(colors.cyan, `Model ID: ${result.modelId}`);
    print(colors.cyan, `Score (basis points): ${result.scoreBps} (${result.scoreBps / 100}%)`);
    print(colors.cyan, `Timestamp: ${result.timestamp}`);
    print(colors.cyan, `Latency: ${latency}ms`);
    
    // Check if the score indicates it's fake (>5000 basis points = >50%)
    if (result.scoreBps > 5000) {
      print(colors.green, 'TEST PASSED: Image correctly identified as fake');
    } else {
      print(colors.red, 'TEST FAILED: Image incorrectly identified as real');
    }
    
    return result;
  } catch (error) {
    print(colors.red, `Error: ${error.message}`);
    return null;
  }
}

// Test the web verification API
async function testWebVerification(base64Image) {
  print(colors.bright, '\n=== Testing Web Verification API ===');
  
  try {
    const startTime = Date.now();
    print(colors.blue, `Sending request to ${API_URL}`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Image })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Verification failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    print(colors.green, 'Verification successful!');
    print(colors.cyan, `Content Hash: ${result.contentHash}`);
    print(colors.cyan, `Model ID: ${result.modelId}`);
    print(colors.cyan, `Score (basis points): ${result.scoreBps} (${result.scoreBps / 100}%)`);
    print(colors.cyan, `Verified: ${result.verified}`);
    print(colors.cyan, `Timestamp: ${result.timestamp}`);
    print(colors.cyan, `Latency: ${latency}ms`);
    
    // Check if the verification result is correct (should be false for fake images)
    if (result.verified === false) {
      print(colors.green, 'TEST PASSED: Image correctly verified as fake');
    } else {
      print(colors.red, 'TEST FAILED: Image incorrectly verified as real');
    }
    
    // Check if the result format is suitable for blockchain storage
    const blockchainReady = 
      result.contentHash && 
      result.contentHash.startsWith('0x') && 
      result.modelId && 
      result.modelId.startsWith('0x') && 
      typeof result.scoreBps === 'number' && 
      typeof result.timestamp === 'number';
    
    if (blockchainReady) {
      print(colors.green, 'TEST PASSED: Result format is ready for blockchain storage');
      print(colors.magenta, 'Blockchain-ready data:');
      console.log({
        contentHash: result.contentHash,
        modelId: result.modelId,
        scoreBps: result.scoreBps,
        verified: result.verified,
        timestamp: result.timestamp,
        verifierAddress: result.verifierAddress || '0x0000000000000000000000000000000000000000'
      });
    } else {
      print(colors.red, 'TEST FAILED: Result format is not ready for blockchain storage');
    }
    
    return result;
  } catch (error) {
    print(colors.red, `Error: ${error.message}`);
    return null;
  }
}

// Test consistency by running multiple verifications
async function testConsistency(numTests = 3) {
  print(colors.bright, `\n=== Testing Consistency (${numTests} runs) ===`);
  
  const results = [];
  const base64Image = generateFakeImageBase64();
  
  for (let i = 0; i < numTests; i++) {
    print(colors.blue, `\nTest run ${i + 1}/${numTests}`);
    const result = await testInferenceService(base64Image);
    if (result) {
      results.push(result.scoreBps);
    }
  }
  
  if (results.length > 1) {
    // Check consistency of scores
    const mean = results.reduce((sum, score) => sum + score, 0) / results.length;
    const variance = results.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);
    
    print(colors.cyan, `\nConsistency Results:`);
    print(colors.cyan, `Mean Score: ${mean.toFixed(2)} basis points`);
    print(colors.cyan, `Standard Deviation: ${stdDev.toFixed(2)} basis points`);
    
    // Check if results are consistent (low standard deviation)
    if (stdDev < 500) { // Less than 5% variation
      print(colors.green, 'TEST PASSED: GPT-5 responses are consistent');
    } else {
      print(colors.yellow, 'TEST WARNING: GPT-5 responses show some inconsistency');
    }
  } else {
    print(colors.red, 'TEST FAILED: Not enough successful tests to check consistency');
  }
}

// Main function
async function main() {
  print(colors.bright, '=== VeriChain GPT-5 Verification Test ===');
  
  try {
    // Generate a fake image
    print(colors.blue, 'Generating fake test image...');
    const fakeImageBase64 = generateFakeImageBase64();
    print(colors.green, 'Fake image generated');
    
    // Test inference service
    await testInferenceService(fakeImageBase64);
    
    // Test web verification API
    await testWebVerification(fakeImageBase64);
    
    // Test consistency
    await testConsistency(3);
    
    print(colors.bright, '\n=== Test Summary ===');
    print(colors.green, 'All tests completed!');
    
  } catch (error) {
    print(colors.red, `Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
