#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/verify';
const DETAILED_API_URL = process.env.DETAILED_API_URL || 'http://localhost:3000/api/verify/detailed';
const TEST_IMAGE_PATH = process.env.TEST_IMAGE_PATH || './test-image.jpg';
const DEFAULT_TEST_IMAGE = 'https://via.placeholder.com/224x224/0000FF/FFFFFF?text=Test';

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

// Helper function to print colored output
function print(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Helper function to read image as base64
async function getImageAsBase64() {
  try {
    // Check if test image exists
    if (fs.existsSync(TEST_IMAGE_PATH)) {
      print(colors.blue, `Reading local image from ${TEST_IMAGE_PATH}`);
      const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      return imageBuffer.toString('base64');
    } else {
      // Fetch placeholder image
      print(colors.yellow, `Local image not found. Using default test image: ${DEFAULT_TEST_IMAGE}`);
      const response = await fetch(DEFAULT_TEST_IMAGE);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer.toString('base64');
    }
  } catch (error) {
    print(colors.red, `Error reading/fetching image: ${error.message}`);
    process.exit(1);
  }
}

// Test basic verification with base64 image
async function testBasicVerification(base64Image) {
  print(colors.bright, '\n=== Testing Basic Verification with Base64 ===');
  
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
    print(colors.cyan, `Latency: ${latency}ms`);
    
    return result;
  } catch (error) {
    print(colors.red, `Error: ${error.message}`);
    return null;
  }
}

// Test detailed verification with base64 image
async function testDetailedVerification(base64Image) {
  print(colors.bright, '\n=== Testing Detailed Verification with Base64 ===');
  
  try {
    const startTime = Date.now();
    print(colors.blue, `Sending request to ${DETAILED_API_URL}`);
    
    const response = await fetch(DETAILED_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Image })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Detailed verification failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    print(colors.green, 'Detailed verification successful!');
    print(colors.cyan, `Content Hash: ${result.contentHash}`);
    print(colors.cyan, `Model ID: ${result.modelId}`);
    print(colors.cyan, `Score (basis points): ${result.scoreBps} (${result.scoreBps / 100}%)`);
    print(colors.cyan, `Verified: ${result.verified}`);
    print(colors.cyan, `Latency: ${latency}ms`);
    print(colors.magenta, '\nExplanation:');
    console.log(result.explanation);
    
    return result;
  } catch (error) {
    print(colors.red, `Error: ${error.message}`);
    return null;
  }
}

// Main function
async function main() {
  print(colors.bright, '=== VeriChain Base64 Verification Test ===');
  
  try {
    // Get image as base64
    const base64Image = await getImageAsBase64();
    print(colors.green, 'Image loaded successfully');
    
    // Test basic verification
    const basicResult = await testBasicVerification(base64Image);
    
    // Test detailed verification
    const detailedResult = await testDetailedVerification(base64Image);
    
    // Summary
    print(colors.bright, '\n=== Test Summary ===');
    if (basicResult && detailedResult) {
      print(colors.green, 'All tests passed successfully!');
      process.exit(0);
    } else {
      print(colors.red, 'Some tests failed. See errors above.');
      process.exit(1);
    }
  } catch (error) {
    print(colors.red, `Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
