/**
 * VeriChain Relayer
 * 
 * This service handles blockchain interactions for storing image verification results
 * using the ImageVerification smart contract.
 */

import pino from "pino";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";
import dotenv from "dotenv";

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

// Load contract ABIs
const verificationContractPath = resolve(rootDir, "packages/contracts/artifacts/contracts/ImageVerification.sol/ImageVerification.json");
const tokenContractPath = resolve(rootDir, "packages/contracts/artifacts/contracts/TruChain.sol/TruChain.json");
let verificationABI;
let tokenABI;

try {
  if (fs.existsSync(verificationContractPath)) {
    const contractJson = JSON.parse(fs.readFileSync(verificationContractPath, 'utf8'));
    verificationABI = contractJson.abi;
  } else {
    logger.warn(`Verification contract ABI not found at ${verificationContractPath}. Using stub mode.`);
  }
  
  if (fs.existsSync(tokenContractPath)) {
    const tokenJson = JSON.parse(fs.readFileSync(tokenContractPath, 'utf8'));
    tokenABI = tokenJson.abi;
  } else {
    logger.warn(`Token contract ABI not found at ${tokenContractPath}. Using stub mode.`);
  }
} catch (error) {
  logger.error(`Error loading contract ABIs: ${error.message}`);
}

// Configuration
const NETWORK_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "http://localhost:8545";
const VERIFICATION_CONTRACT_ADDRESS = process.env.IMAGE_VERIFICATION_ADDRESS;
const TOKEN_CONTRACT_ADDRESS = process.env.TRUCHAIN_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// Initialize provider and wallet
let provider;
let wallet;
let verificationContract;
let tokenContract;
let isContractConnected = false;

/**
 * Initialize blockchain connection
 */
async function initializeBlockchain() {
  try {
    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not set in environment variables");
    }

    if (!VERIFICATION_CONTRACT_ADDRESS) {
      throw new Error("VERIFICATION_CONTRACT_ADDRESS not set in environment variables");
    }
    
    if (!TOKEN_CONTRACT_ADDRESS) {
      throw new Error("TOKEN_CONTRACT_ADDRESS not set in environment variables");
    }

    // Initialize provider
    provider = new ethers.providers.JsonRpcProvider(NETWORK_RPC_URL);
    
    // Initialize wallet
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    
    // Get network information
    const network = await provider.getNetwork();
    
    logger.info({
      msg: "Connected to blockchain",
      network: network.name,
      chainId: network.chainId,
      address,
    });
    
    // Initialize verification contract
    if (verificationABI && VERIFICATION_CONTRACT_ADDRESS) {
      verificationContract = new ethers.Contract(VERIFICATION_CONTRACT_ADDRESS, verificationABI, wallet);
      
      // Check if we're authorized as a verifier
      const isVerifier = await verificationContract.authorizedVerifiers(address);
      
      if (!isVerifier) {
        logger.warn({
          msg: "Wallet is not authorized as a verifier",
          address,
        });
      } else {
        logger.info({
          msg: "Wallet is authorized as a verifier",
          address,
        });
        isContractConnected = true;
      }
      
      // Get verification price
      const verificationPrice = await verificationContract.verificationPrice();
      logger.info({
        msg: "Verification price",
        price: ethers.utils.formatEther(verificationPrice),
        priceWei: verificationPrice.toString(),
      });
    }
    
    // Initialize token contract
    if (tokenABI && TOKEN_CONTRACT_ADDRESS) {
      tokenContract = new ethers.Contract(TOKEN_CONTRACT_ADDRESS, tokenABI, wallet);
      
      // Get token info
      const tokenName = await tokenContract.name();
      const tokenSymbol = await tokenContract.symbol();
      const tokenBalance = await tokenContract.balanceOf(address);
      
      logger.info({
        msg: "Token contract initialized",
        name: tokenName,
        symbol: tokenSymbol,
        balance: ethers.utils.formatEther(tokenBalance),
        balanceWei: tokenBalance.toString(),
      });
    }
    
    return true;
  } catch (error) {
    logger.error({
      msg: "Failed to initialize blockchain connection",
      error: error.message,
    });
    return false;
  }
}

/**
 * Write verification result to blockchain
 */
export async function writeProof(result) {
  const startTime = Date.now();
  
  try {
    // Check if we have a contract connection
    if (!isContractConnected) {
      // Try to initialize
      const initialized = await initializeBlockchain();
      if (!initialized) {
        // Fall back to stub mode
        return writeProofStub(result);
      }
    }
    
    logger.info({
      msg: "Writing verification to blockchain",
      contentHash: result.contentHash,
      modelId: result.modelId,
      scoreBps: result.scoreBps,
    });
    
    // Call the contract
    const tx = await verificationContract.storeVerification(
      result.contentHash,
      result.modelId,
      result.scoreBps,
      result.timestamp
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Verification written to blockchain",
      contentHash: result.contentHash,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      latency,
    });
    
    return {
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: Math.floor(Date.now() / 1000),
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to write verification to blockchain",
      contentHash: result.contentHash,
      error: error.message,
      latency,
    });
    
    // Fall back to stub mode
    return writeProofStub(result);
  }
}

/**
 * Read verification result from blockchain
 */
export async function readProof(contentHash) {
  const startTime = Date.now();
  
  try {
    // Check if we have a contract connection
    if (!isContractConnected) {
      // Try to initialize
      const initialized = await initializeBlockchain();
      if (!initialized) {
        // Fall back to stub mode
        return readProofStub(contentHash);
      }
    }
    
    logger.info({
      msg: "Reading verification from blockchain",
      contentHash,
    });
    
    // Call the contract
    const result = await verificationContract.getVerification(contentHash);
    
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Verification read from blockchain",
      contentHash,
      modelId: result.modelId,
      scoreBps: result.scoreBps.toString(),
      verified: result.verified,
      timestamp: result.timestamp.toString(),
      verifier: result.verifier,
      latency,
    });
    
    return {
      contentHash: result.contentHash,
      modelId: result.modelId,
      scoreBps: result.scoreBps.toNumber(),
      verified: result.verified,
      timestamp: result.timestamp.toNumber(),
      verifier: result.verifier,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to read verification from blockchain",
      contentHash,
      error: error.message,
      latency,
    });
    
    // Fall back to stub mode
    return readProofStub(contentHash);
  }
}

/**
 * Check if image is verified on blockchain
 */
export async function isImageVerified(contentHash) {
  const startTime = Date.now();
  
  try {
    // Check if we have a contract connection
    if (!isContractConnected) {
      // Try to initialize
      const initialized = await initializeBlockchain();
      if (!initialized) {
        // Fall back to stub mode
        return false;
      }
    }
    
    // Call the contract
    const isVerified = await verificationContract.isImageVerified(contentHash);
    
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Image verification status checked",
      contentHash,
      isVerified,
      latency,
    });
    
    return isVerified;
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to check image verification status",
      contentHash,
      error: error.message,
      latency,
    });
    
    return false;
  }
}

/**
 * Store verification with payment
 * For users who want to pay for verification
 */
export async function storeVerificationWithPayment(result) {
  const startTime = Date.now();
  
  try {
    // Check if we have a contract connection
    if (!isContractConnected) {
      // Try to initialize
      const initialized = await initializeBlockchain();
      if (!initialized) {
        // Fall back to stub mode
        return writeProofStub(result);
      }
    }
    
    logger.info({
      msg: "Storing verification with payment",
      contentHash: result.contentHash,
      modelId: result.modelId,
      scoreBps: result.scoreBps,
      from: result.from,
    });
    
    // First, check if the user has approved the tokens
    const verificationPrice = await verificationContract.verificationPrice();
    const allowance = await tokenContract.allowance(result.from, VERIFICATION_CONTRACT_ADDRESS);
    
    if (allowance.lt(verificationPrice)) {
      throw new Error(`User has not approved enough tokens. Required: ${ethers.utils.formatEther(verificationPrice)}, Approved: ${ethers.utils.formatEther(allowance)}`);
    }
    
    // Call the contract
    const tx = await verificationContract.storeVerificationWithPayment(
      result.contentHash,
      result.modelId,
      result.scoreBps,
      result.timestamp,
      { from: result.from }
    );
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    const latency = Date.now() - startTime;
    
    logger.info({
      msg: "Verification with payment stored on blockchain",
      contentHash: result.contentHash,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      latency,
    });
    
    return {
      success: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      timestamp: Math.floor(Date.now() / 1000),
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    
    logger.error({
      msg: "Failed to store verification with payment",
      contentHash: result.contentHash,
      error: error.message,
      latency,
    });
    
    // Fall back to stub mode
    return writeProofStub(result);
  }
}

/**
 * Stub function for writing proof to blockchain
 */
export function writeProofStub(result) {
  const timestamp = new Date().toISOString();
  
  logger.info({
    msg: "STUB MODE: Would write to blockchain",
    contentHash: result.contentHash,
    modelId: result.modelId,
    scoreBps: result.scoreBps,
    timestamp: result.timestamp,
    traceId: result.traceId,
    blockchainTimestamp: timestamp,
  });
  
  // Simulate blockchain transaction
  const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
  const blockNumber = Math.floor(Math.random() * 1000000) + 1000000;
  
  logger.info({
    msg: "STUB MODE: Simulated transaction",
    txHash,
    blockNumber,
    gasUsed: Math.floor(Math.random() * 100000) + 50000,
    gasPrice: "20000000000", // 20 gwei
  });
  
  return {
    success: true,
    txHash,
    blockNumber,
    timestamp,
    message: "Proof logged (stub mode - no actual blockchain interaction)",
  };
}

/**
 * Stub function for reading proof from blockchain
 */
export function readProofStub(contentHash) {
  logger.info({
    msg: "STUB MODE: Would read from blockchain",
    contentHash,
    timestamp: new Date().toISOString(),
  });
  
  // Return mock data for now
  return {
    contentHash,
    modelId: "0x0000000000000000000000000000000000000000000000000000000000000000",
    scoreBps: 0,
    timestamp: 0,
    verifier: "0x0000000000000000000000000000000000000000",
    message: "Mock proof data (stub mode)",
  };
}

// Export all functions
export default {
  writeProof,
  readProof,
  isImageVerified,
  storeVerificationWithPayment,
  initializeBlockchain,
};

// If running directly, initialize and show info
if (import.meta.url === `file://${process.argv[1]}`) {
  logger.info("VeriChain Relayer Starting");
  
  // Initialize blockchain connection
  initializeBlockchain().then((initialized) => {
    if (initialized) {
      logger.info("Blockchain connection initialized successfully");
    } else {
      logger.warn("Running in stub mode - no blockchain interaction");
    }
    
    // Example usage
    const exampleResult = {
      contentHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      modelId: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      scoreBps: 8500,
      timestamp: Math.floor(Date.now() / 1000),
      traceId: "example-trace-123",
    };
    
    logger.info("Example proof result:");
    logger.info(exampleResult);
    
    // Simulate writing to blockchain
    writeProof(exampleResult);
  });
}