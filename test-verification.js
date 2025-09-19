#!/usr/bin/env node

/**
 * VeriChain End-to-End Test Script
 * 
 * This script tests the complete verification flow:
 * 1. Web service health
 * 2. Inference service health  
 * 3. OpenAI chat endpoint
 * 4. Image verification endpoint
 * 
 * Run with: node test-verification.js
 */

import fetch from "node-fetch";

const WEB_URL = process.env.WEB_URL || "http://localhost:3000";
const INFERENCE_URL = process.env.INFERENCE_URL || "http://localhost:3001";

async function testHealth() {
  console.log("🔍 Testing service health...");
  
  try {
    const [webHealth, inferenceHealth] = await Promise.all([
      fetch(`${WEB_URL}/healthz`).then(r => r.json()),
      fetch(`${INFERENCE_URL}/healthz`).then(r => r.json())
    ]);
    
    console.log("✅ Web service:", webHealth.status);
    console.log("✅ Inference service:", inferenceHealth.status);
    
    return webHealth.status === "healthy" && inferenceHealth.status === "healthy";
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

async function testOpenAIChat() {
  console.log("\n🤖 Testing OpenAI chat endpoint...");
  
  if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️  OPENAI_API_KEY not set, skipping chat test");
    return true;
  }
  
  try {
    const response = await fetch(`${WEB_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Say 'Hello from VeriChain!' in exactly 5 words." }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log("✅ Chat response received:", text.substring(0, 50) + "...");
    
    return text.includes("Hello") || text.includes("VeriChain");
  } catch (error) {
    console.error("❌ Chat test failed:", error.message);
    return false;
  }
}

async function testImageVerification() {
  console.log("\n🖼️  Testing image verification endpoint...");
  
  try {
    // Test with a sample image URL (replace with a real one for testing)
    const testImageUrl = "https://via.placeholder.com/224x224/0000FF/FFFFFF?text=Test";
    
    const response = await fetch(`${WEB_URL}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: testImageUrl })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HTTP ${response.status}: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    console.log("✅ Verification result:", {
      contentHash: result.contentHash?.substring(0, 10) + "...",
      scoreBps: result.scoreBps,
      modelId: result.modelId?.substring(0, 10) + "...",
      traceId: result.traceId
    });
    
    return result.contentHash && result.scoreBps !== undefined;
  } catch (error) {
    console.error("❌ Verification test failed:", error.message);
    return false;
  }
}

async function testInferenceDirect() {
  console.log("\n🧠 Testing inference service directly...");
  
  try {
    const response = await fetch(`${INFERENCE_URL}/metrics`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const metrics = await response.json();
    console.log("✅ Inference metrics:", {
      modelId: metrics.modelId?.substring(0, 10) + "...",
      inputShape: metrics.inputShape
    });
    
    return metrics.modelId;
  } catch (error) {
    console.error("❌ Inference metrics test failed:", error.message);
    return false;
  }
}

async function runAllTests() {
  console.log("🚀 Starting VeriChain End-to-End Tests\n");
  
  const tests = [
    { name: "Health Check", fn: testHealth },
    { name: "OpenAI Chat", fn: testOpenAIChat },
    { name: "Inference Metrics", fn: testInferenceDirect },
    { name: "Image Verification", fn: testImageVerification }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const startTime = Date.now();
    const passed = await test.fn();
    const duration = Date.now() - startTime;
    
    results.push({ name: test.name, passed, duration });
    
    if (passed) {
      console.log(`✅ ${test.name} passed (${duration}ms)`);
    } else {
      console.log(`❌ ${test.name} failed (${duration}ms)`);
    }
  }
  
  console.log("\n📊 Test Results Summary:");
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? "✅" : "❌";
    console.log(`${status} ${result.name}: ${result.passed ? "PASS" : "FAIL"} (${result.duration}ms)`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log("🎉 All tests passed! VeriChain is working correctly.");
    process.exit(0);
  } else {
    console.log("💥 Some tests failed. Check the logs above for details.");
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
VeriChain End-to-End Test Script

Usage: node test-verification.js [options]

Options:
  --help, -h     Show this help message
  --web-url      Web service URL (default: http://localhost:3000)
  --inference-url Inference service URL (default: http://localhost:3001)

Environment Variables:
  OPENAI_API_KEY OpenAI API key for chat testing
  WEB_URL        Web service URL
  INFERENCE_URL  Inference service URL

Examples:
  node test-verification.js
  OPENAI_API_KEY=sk-... node test-verification.js
  node test-verification.js --web-url http://localhost:3000
`);
  process.exit(0);
}

// Parse command line arguments
process.argv.forEach(arg => {
  if (arg.startsWith("--web-url=")) {
    process.env.WEB_URL = arg.split("=")[1];
  } else if (arg.startsWith("--inference-url=")) {
    process.env.INFERENCE_URL = arg.split("=")[1];
  }
});

// Run tests
runAllTests().catch(error => {
  console.error("💥 Test runner failed:", error);
  process.exit(1);
});
