/**
 * VeriChain Relayer API Server
 * 
 * This server provides API endpoints for interacting with the blockchain
 * to store and retrieve image verification results.
 */

import express from "express";
import pino from "pino";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import dotenv from "dotenv";
import relayer from "./relayer.js";

// Load environment variables from root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "../..");
const envPath = resolve(rootDir, ".env");

if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`No .env file found at ${envPath}`);
  dotenv.config();
}

// Configure logging
const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
    },
  },
});

const app = express();
app.use(express.json({ limit: "10mb" }));

// Health check endpoint
app.get("/healthz", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "verichain-relayer",
    timestamp: Date.now()
  });
});

// Store verification result on blockchain
app.post("/api/store", async (req, res) => {
  const startTime = Date.now();
  const { contentHash, modelId, scoreBps, timestamp, traceId } = req.body;
  
  logger.info({ 
    traceId, 
    contentHash, 
    msg: "Received request to store verification" 
  });
  
  try {
    // Validate input
    if (!contentHash || !modelId || scoreBps === undefined || !timestamp) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        traceId 
      });
    }
    
    // Store on blockchain
    const result = await relayer.writeProof({
      contentHash,
      modelId,
      scoreBps,
      timestamp,
      traceId
    });
    
    const latency = Date.now() - startTime;
    
    logger.info({ 
      traceId, 
      contentHash, 
      txHash: result.txHash, 
      latency, 
      msg: "Verification stored on blockchain" 
    });
    
    res.json({
      success: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      timestamp: result.timestamp,
      latency
    });
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({ 
      traceId, 
      contentHash, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Failed to store verification" 
    });
    
    res.status(500).json({ 
      error: "Failed to store verification", 
      traceId,
      details: error.message 
    });
  }
});

// Store verification with payment
app.post("/api/store/paid", async (req, res) => {
  const startTime = Date.now();
  const { contentHash, modelId, scoreBps, timestamp, traceId, from } = req.body;
  
  logger.info({ 
    traceId, 
    contentHash,
    from,
    msg: "Received request to store verification with payment" 
  });
  
  try {
    // Validate input
    if (!contentHash || !modelId || scoreBps === undefined || !timestamp || !from) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        traceId 
      });
    }
    
    // Store on blockchain with payment
    const result = await relayer.storeVerificationWithPayment({
      contentHash,
      modelId,
      scoreBps,
      timestamp,
      traceId,
      from
    });
    
    const latency = Date.now() - startTime;
    
    logger.info({ 
      traceId, 
      contentHash, 
      txHash: result.txHash, 
      latency, 
      msg: "Verification with payment stored on blockchain" 
    });
    
    res.json({
      success: true,
      txHash: result.txHash,
      blockNumber: result.blockNumber,
      timestamp: result.timestamp,
      latency
    });
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({ 
      traceId, 
      contentHash, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Failed to store verification with payment" 
    });
    
    res.status(500).json({ 
      error: "Failed to store verification with payment", 
      traceId,
      details: error.message 
    });
  }
});

// Get verification result from blockchain
app.get("/api/verify/:contentHash", async (req, res) => {
  const startTime = Date.now();
  const { contentHash } = req.params;
  
  logger.info({ 
    contentHash, 
    msg: "Received request to get verification" 
  });
  
  try {
    // Get from blockchain
    const result = await relayer.readProof(contentHash);
    
    const latency = Date.now() - startTime;
    
    logger.info({ 
      contentHash, 
      verified: result.verified, 
      latency, 
      msg: "Verification retrieved from blockchain" 
    });
    
    res.json({
      contentHash: result.contentHash,
      modelId: result.modelId,
      scoreBps: result.scoreBps,
      verified: result.verified,
      timestamp: result.timestamp,
      verifier: result.verifier,
      latency
    });
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({ 
      contentHash, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Failed to get verification" 
    });
    
    res.status(500).json({ 
      error: "Failed to get verification", 
      details: error.message 
    });
  }
});

// Check if image is verified on blockchain
app.get("/api/status/:contentHash", async (req, res) => {
  const startTime = Date.now();
  const { contentHash } = req.params;
  
  logger.info({ 
    contentHash, 
    msg: "Received request to check verification status" 
  });
  
  try {
    // Check on blockchain
    const verified = await relayer.isImageVerified(contentHash);
    
    const latency = Date.now() - startTime;
    
    logger.info({ 
      contentHash, 
      verified, 
      latency, 
      msg: "Verification status checked" 
    });
    
    res.json({
      contentHash,
      verified,
      timestamp: Math.floor(Date.now() / 1000),
      latency
    });
    
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({ 
      contentHash, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Failed to check verification status" 
    });
    
    res.status(500).json({ 
      error: "Failed to check verification status", 
      details: error.message 
    });
  }
});

// Start server
const port = process.env.RELAYER_PORT || 3002;

// Initialize blockchain connection
relayer.initializeBlockchain().then((initialized) => {
  if (initialized) {
    logger.info("Blockchain connection initialized successfully");
  } else {
    logger.warn("Running in stub mode - no blockchain interaction");
  }
  
  // Start the server
  app.listen(port, () => {
    logger.info(`VeriChain relayer service listening on port ${port}`);
  });
});
