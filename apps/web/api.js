/**
 * VeriChain API Client for Blockchain Interactions
 * 
 * This module provides functions to interact with the blockchain relayer service
 * for storing and retrieving image verification results.
 */

import fetch from "node-fetch";
import pino from "pino";

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

// Configuration
const RELAYER_URL = process.env.RELAYER_URL || "http://localhost:3002";

/**
 * Store verification result on blockchain
 */
export async function storeVerificationOnChain(verificationResult) {
  const startTime = Date.now();
  
  try {
    logger.info({
      msg: "Storing verification on blockchain",
      contentHash: verificationResult.contentHash,
    });
    
    const response = await fetch(`${RELAYER_URL}/api/store`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verificationResult),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to store verification: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Verification stored on blockchain",
      contentHash: verificationResult.contentHash,
      txHash: result.txHash,
      latency,
    });
    
    return {
      ...result,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to store verification on blockchain",
      contentHash: verificationResult.contentHash,
      error: error.message,
      latency,
    });
    
    // Return mock result in case of failure
    return {
      success: false,
      error: error.message,
      latency,
    };
  }
}

/**
 * Get verification result from blockchain
 */
export async function getVerificationFromChain(contentHash) {
  const startTime = Date.now();
  
  try {
    logger.info({
      msg: "Getting verification from blockchain",
      contentHash,
    });
    
    const response = await fetch(`${RELAYER_URL}/api/verify/${contentHash}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get verification: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Verification retrieved from blockchain",
      contentHash,
      verified: result.verified,
      latency,
    });
    
    return {
      ...result,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to get verification from blockchain",
      contentHash,
      error: error.message,
      latency,
    });
    
    // Return mock result in case of failure
    return {
      success: false,
      error: error.message,
      latency,
    };
  }
}

/**
 * Check if image is verified on blockchain
 */
export async function isImageVerifiedOnChain(contentHash) {
  const startTime = Date.now();
  
  try {
    logger.info({
      msg: "Checking if image is verified on blockchain",
      contentHash,
    });
    
    const response = await fetch(`${RELAYER_URL}/api/status/${contentHash}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to check verification status: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Image verification status checked",
      contentHash,
      verified: result.verified,
      latency,
    });
    
    return {
      verified: result.verified,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to check image verification status",
      contentHash,
      error: error.message,
      latency,
    });
    
    // Return default result in case of failure
    return {
      verified: false,
      error: error.message,
      latency,
    };
  }
}

// Export all functions
export default {
  storeVerificationOnChain,
  getVerificationFromChain,
  isImageVerifiedOnChain,
};
