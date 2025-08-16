import express from "express";
import OpenAI from "openai";
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

// Simple verification test endpoint
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
      throw new Error(`Inference failed: ${error.error || response.statusText}`);
    }
    
    const result = await response.json();
    const latency = Date.now() - startTime;
    
    logger.info({ 
      traceId, 
      contentHash: result.contentHash,
      scoreBps: result.scoreBps,
      latency, 
      msg: "Verification completed" 
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`VeriChain web service listening on port ${port}`);
  logger.info(`OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
  logger.info(`Inference URL: ${process.env.INFERENCE_URL || "http://localhost:3001"}`);
});
