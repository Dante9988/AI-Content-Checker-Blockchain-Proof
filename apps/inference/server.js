import express from "express";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import pino from "pino";
import crypto from "crypto";

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
const MODEL_PATH = process.env.MODEL_PATH || "./models/model.onnx";
const IMG_SIZE = 224;
const PORT = process.env.PORT || 3001;

// Global variables
let session = null;
let modelId = null;

// Initialize ONNX session
async function initializeModel() {
  try {
    logger.info(`Loading ONNX model from ${MODEL_PATH}`);
    
    // Load the model
    session = await ort.InferenceSession.create(MODEL_PATH);
    
    // Get model metadata
    const inputMeta = session.inputNames[0];
    
    logger.info(`Model loaded successfully. Input: ${inputMeta}`);
    
    // Calculate model hash for modelId
    const fs = await import("fs");
    const modelBuffer = fs.readFileSync(MODEL_PATH);
    const hash = crypto.createHash("sha256").update(modelBuffer).digest("hex");
    modelId = `0x${hash}`;
    
    logger.info(`Model ID: ${modelId}`);
    
  } catch (error) {
    logger.error("Failed to initialize model:", error);
    process.exit(1);
  }
}

// Preprocess image
async function preprocessImage(imageBuffer) {
  try {
    // Resize and center crop to 224x224
    const processed = await sharp(imageBuffer)
      .resize(IMG_SIZE, IMG_SIZE, { fit: "cover" })
      .toBuffer();
    
    // Convert to Float32 array and normalize to [0, 1]
    const pixels = new Uint8Array(processed);
    const floatArray = new Float32Array(IMG_SIZE * IMG_SIZE * 3);
    
    for (let i = 0; i < pixels.length; i++) {
      floatArray[i] = pixels[i] / 255.0;
    }
    
    // Reshape to [1, 224, 224, 3] for ONNX input
    return floatArray;
    
  } catch (error) {
    logger.error("Image preprocessing failed:", error);
    throw new Error("Image preprocessing failed");
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
    modelLoaded: session !== null,
    modelId: modelId,
    timestamp: Date.now()
  });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  res.json({
    modelId: modelId,
    inputShape: session ? [1, IMG_SIZE, IMG_SIZE, 3] : null,
    timestamp: Date.now()
  });
});

// Main inference endpoint
app.post("/infer", async (req, res) => {
  const startTime = Date.now();
  const traceId = crypto.randomUUID();
  
  logger.info({ traceId, msg: "Inference request received" });
  
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
    
    // Preprocess image
    const inputTensor = await preprocessImage(imageBuffer);
    
    // Run inference
    const inputName = session.inputNames[0];
    const input = new ort.Tensor("float32", inputTensor, [1, IMG_SIZE, IMG_SIZE, 3]);
    
    const results = await session.run({ [inputName]: input });
    const output = results[session.outputNames[0]];
    
    // Get score (probability of being AI-generated)
    const score = output.data[0];
    const scoreBps = Math.round(score * 10000); // Convert to basis points (0-10000)
    
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
      msg: "Inference completed successfully" 
    });
    
    res.json(result);
    
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error({ 
      traceId, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Inference failed" 
    });
    
    res.status(500).json({ 
      error: "Inference failed", 
      traceId,
      details: error.message 
    });
  }
});

// Start server
async function startServer() {
  await initializeModel();
  
  app.listen(PORT, () => {
    logger.info(`Inference service listening on port ${PORT}`);
    logger.info(`Model loaded: ${MODEL_PATH}`);
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
export { app, initializeModel };
