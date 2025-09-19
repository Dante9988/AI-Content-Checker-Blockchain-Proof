import express from "express";
import OpenAI from "openai";
import sharp from "sharp";
import pino from "pino";
import crypto from "crypto";
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

const app = express();
app.use(express.json({ limit: "10mb" }));

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
const IMG_SIZE = 224;
const PORT = process.env.PORT || 3001;
const GPT_MODEL = process.env.GPT_MODEL || "gpt-5";

// Global variables
let openai = null;
let modelId = null;

// Initialize OpenAI client
async function initializeGPT() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    
    logger.info(`Initializing OpenAI client with model ${GPT_MODEL}`);
    
    // Initialize OpenAI client
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Generate a fixed model ID based on the GPT model name
    const modelIdBase = `gpt-verification-${GPT_MODEL}`;
    const hash = crypto.createHash("sha256").update(modelIdBase).digest("hex");
    modelId = `0x${hash}`;
    
    logger.info(`Model ID: ${modelId}`);
    
  } catch (error) {
    logger.error("Failed to initialize GPT:", error);
    process.exit(1);
  }
}

// Process image to base64
async function processImageToBase64(imageBuffer) {
  try {
    // Resize image to standard size
    const processed = await sharp(imageBuffer)
      .resize(IMG_SIZE, IMG_SIZE, { fit: "cover" })
      .toBuffer();
    
    // Convert to base64
    return processed.toString('base64');
    
  } catch (error) {
    logger.error("Image processing failed:", error);
    throw new Error("Image processing failed");
  }
}

// Calculate content hash
function calculateContentHash(imageBuffer) {
  const hash = crypto.createHash("sha256").update(imageBuffer).digest("hex");
  return `0x${hash}`;
}

// Health check endpoint
app.get("/healthz", (req, res) => {
  res.json({ 
    status: "healthy", 
    gptConfigured: openai !== null,
    modelId: modelId,
    timestamp: Date.now()
  });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  res.json({
    modelId: modelId,
    gptModel: GPT_MODEL,
    timestamp: Date.now()
  });
});

// Main inference endpoint
app.post("/infer", async (req, res) => {
  const startTime = Date.now();
  const traceId = crypto.randomUUID();
  
  logger.info({ traceId, msg: "Verification request received" });
  
  try {
    const { imageUrl, base64 } = req.body;
    
    if (!imageUrl && !base64) {
      return res.status(400).json({ 
        error: "Either imageUrl or base64 must be provided",
        traceId 
      });
    }
    
    let imageBuffer;
    
    // Handle base64 input
    if (base64) {
      imageBuffer = Buffer.from(base64, "base64");
    } 
    // Handle URL input
    else if (imageUrl) {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    }
    
    // Calculate content hash
    const contentHash = calculateContentHash(imageBuffer);
    
    // Process image to base64 for GPT
    const imageBase64 = await processImageToBase64(imageBuffer);
    
    // Create GPT prompt for image analysis
    const response = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        {
          role: "system",
          content: "You are an AI image verification expert. Analyze the provided image and determine if it's real or AI-generated. Respond with a score from 0 to 1, where 0 means definitely real and 1 means definitely AI-generated. Only respond with a single number."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Is this image real or AI-generated? Respond with a score from 0 to 1."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 10
    });
    
    // Parse GPT response to get score
    const gptResponse = response.choices[0].message.content.trim();
    let score = parseFloat(gptResponse);
    
    // Ensure score is valid
    if (isNaN(score) || score < 0 || score > 1) {
      logger.warn({
        traceId,
        gptResponse,
        msg: "Invalid GPT score, defaulting to 0.5"
      });
      score = 0.5;
    }
    
    // Convert to basis points (0-10000)
    const scoreBps = Math.round(score * 10000);
    
    const result = {
      contentHash,
      modelId,
      scoreBps,
      timestamp: Math.floor(Date.now() / 1000),
      traceId
    };
    
    const latency = Date.now() - startTime;
    
    logger.info({ 
      traceId, 
      contentHash, 
      scoreBps, 
      latency, 
      msg: "Verification completed successfully" 
    });
    
    res.json(result);
    
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error({ 
      traceId, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Verification failed" 
    });
    
    res.status(500).json({ 
      error: "Verification failed", 
      traceId,
      details: error.message 
    });
  }
});

// Start server
async function startServer() {
  await initializeGPT();
  
  app.listen(PORT, () => {
    logger.info(`Inference service listening on port ${PORT}`);
    logger.info(`GPT model: ${GPT_MODEL}`);
    logger.info(`Model ID: ${modelId}`);
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch(error => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });
}

// Export for testing
export { app, initializeGPT };
