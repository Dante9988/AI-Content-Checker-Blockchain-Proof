import express from "express";
import OpenAI from "openai";
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

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Health check endpoint
app.get("/healthz", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "verichain-web",
    timestamp: Date.now(),
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  res.json({
    service: "verichain-web",
    endpoints: ["/api/chat", "/healthz", "/metrics"],
    timestamp: Date.now()
  });
});

app.post("/api/chat", async (req, res) => {
  const startTime = Date.now();
  const traceId = crypto.randomUUID();
  
  logger.info({ traceId, msg: "Chat request received" });
  
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    logger.warn({ traceId, msg: "Invalid messages format" });
    return res.status(400).json({ error: "messages must be an array" });
  }

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    });

    logger.info({ 
      traceId, 
      requestId: stream.requestId,
      msg: "OpenAI stream created" 
    });
    
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content || "";
      res.write(token);
    }
    
    const latency = Date.now() - startTime;
    logger.info({ 
      traceId, 
      latency, 
      msg: "Chat response completed" 
    });
    
    res.end();
  } catch (err) {
    const latency = Date.now() - startTime;
    logger.error({ 
      traceId, 
      error: err.message, 
      stack: err.stack, 
      latency, 
      msg: "Chat request failed" 
    });
    
    res.status(500).json({ 
      error: "An error occurred", 
      traceId,
      details: err.message 
    });
  }
});

// Simple verification endpoint
app.post("/api/verify", async (req, res) => {
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
    
    // Forward to inference service
    const inferenceUrl = process.env.INFERENCE_URL || "http://localhost:3001";
    const response = await fetch(`${inferenceUrl}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, base64 }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Verification failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    // Add blockchain-ready verification data
    const verificationData = {
      ...result,
      verified: result.scoreBps < 5000, // Less than 50% likelihood of being AI-generated
      verificationTime: Math.floor(Date.now() / 1000),
      verifierAddress: process.env.VERIFIER_ADDRESS || "0x0000000000000000000000000000000000000000"
    };
    
    logger.info({ 
      traceId, 
      contentHash: result.contentHash,
      scoreBps: result.scoreBps,
      verified: verificationData.verified,
      latency, 
      msg: "Verification completed" 
    });
    
    res.json(verificationData);
    
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

// Detailed verification with GPT explanation
app.post("/api/verify/detailed", async (req, res) => {
  const startTime = Date.now();
  const traceId = crypto.randomUUID();
  
  logger.info({ traceId, msg: "Detailed verification request received" });
  
  try {
    const { imageUrl, base64 } = req.body;
    
    if (!imageUrl && !base64) {
      return res.status(400).json({ 
        error: "Either imageUrl or base64 must be provided",
        traceId 
      });
    }
    
    // First get the basic verification from inference service
    const inferenceUrl = process.env.INFERENCE_URL || "http://localhost:3001";
    const response = await fetch(`${inferenceUrl}/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl, base64 }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Verification failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Get detailed explanation from OpenAI
    let imageData = base64;
    if (!imageData && imageUrl) {
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        throw new Error(`Failed to fetch image: ${imgResponse.statusText}`);
      }
      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      imageData = buffer.toString('base64');
    }
    
    const openaiResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at detecting AI-generated images. Provide a detailed explanation of why you believe an image is real or AI-generated. Focus on telltale signs like unnatural lighting, inconsistent shadows, strange textures, anatomical errors, or other artifacts."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and explain in detail why you think it's real or AI-generated. Be specific about the visual elements that led to your conclusion."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`
              }
            }
          ]
        }
      ]
    });
    
    const explanation = openaiResponse.choices[0].message.content;
    const latency = Date.now() - startTime;
    
    // Add blockchain-ready verification data with explanation
    const detailedResult = {
      ...result,
      verified: result.scoreBps < 5000, // Less than 50% likelihood of being AI-generated
      verificationTime: Math.floor(Date.now() / 1000),
      verifierAddress: process.env.VERIFIER_ADDRESS || "0x0000000000000000000000000000000000000000",
      explanation
    };
    
    logger.info({ 
      traceId, 
      contentHash: result.contentHash,
      scoreBps: result.scoreBps,
      verified: detailedResult.verified,
      latency, 
      msg: "Detailed verification completed" 
    });
    
    res.json(detailedResult);
    
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error({ 
      traceId, 
      error: error.message, 
      stack: error.stack, 
      latency, 
      msg: "Detailed verification failed" 
    });
    
    res.status(500).json({ 
      error: "Detailed verification failed", 
      traceId,
      details: error.message 
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`VeriChain web service listening on port ${port}`);
  logger.info(`OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
  logger.info(`Inference URL: ${process.env.INFERENCE_URL || "http://localhost:3001"}`);
});
