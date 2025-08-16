/**
 * VeriChain Client SDK
 * 
 * Provides a simple interface for interacting with VeriChain services
 * including the OpenAI chat, inference, and future smart contract endpoints.
 */

import { ethers } from "ethers";
import type { 
  VerifyRequest, 
  VerifyResult, 
  InferenceRequest, 
  InferenceResponse,
  ContentType 
} from "./types.js";

export class VeriChainClient {
  private baseUrl: string;
  private inferenceUrl: string;
  private openaiApiKey?: string;

  constructor(config: {
    baseUrl?: string;
    inferenceUrl?: string;
    openaiApiKey?: string;
  } = {}) {
    this.baseUrl = config.baseUrl || "http://localhost:3000";
    this.inferenceUrl = config.inferenceUrl || "http://localhost:3001";
    this.openaiApiKey = config.openaiApiKey;
  }

  /**
   * Calculate content hash from file bytes
   */
  static calculateContentHash(fileBytes: Uint8Array): `0x${string}` {
    const hash = ethers.keccak256(fileBytes);
    return hash as `0x${string}`;
  }

  /**
   * Calculate content hash from base64 string
   */
  static calculateContentHashFromBase64(base64: string): `0x${string}` {
    const bytes = Buffer.from(base64, "base64");
    return this.calculateContentHash(bytes);
  }

  /**
   * Calculate content hash from file URL
   */
  static async calculateContentHashFromUrl(url: string): Promise<`0x${string}`> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    return this.calculateContentHash(bytes);
  }

  /**
   * Send chat message to OpenAI via the web service
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    return response.text();
  }

  /**
   * Run inference on an image using the inference service
   */
  async infer(request: InferenceRequest): Promise<InferenceResponse> {
    const response = await fetch(`${this.inferenceUrl}/infer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Inference failed: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Verify content authenticity (main verification flow)
   */
  async verify(
    content: File | string | Uint8Array,
    contentType: ContentType = "image"
  ): Promise<VerifyResult> {
    let contentHash: `0x${string}`;
    let inferenceRequest: InferenceRequest;

    // Calculate content hash and prepare inference request
    if (content instanceof File) {
      const bytes = new Uint8Array(await content.arrayBuffer());
      contentHash = VeriChainClient.calculateContentHash(bytes);
      const base64 = await this.fileToBase64(content);
      inferenceRequest = { base64, contentType };
    } else if (typeof content === "string") {
      // Assume it's a URL
      contentHash = await VeriChainClient.calculateContentHashFromUrl(content);
      inferenceRequest = { imageUrl: content, contentType };
    } else {
      // Uint8Array
      contentHash = VeriChainClient.calculateContentHash(content);
      const base64 = Buffer.from(content).toString("base64");
      inferenceRequest = { base64, contentType };
    }

    // Run inference
    const result = await this.infer(inferenceRequest);

    // Verify content hash matches
    if (result.contentHash !== contentHash) {
      throw new Error("Content hash mismatch between client and server");
    }

    return result;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<{ web: boolean; inference: boolean }> {
    const [webHealth, inferenceHealth] = await Promise.allSettled([
      fetch(`${this.baseUrl}/healthz`).then(r => r.ok),
      fetch(`${this.inferenceUrl}/healthz`).then(r => r.ok),
    ]);

    return {
      web: webHealth.status === "fulfilled" && webHealth.value,
      inference: inferenceHealth.status === "fulfilled" && inferenceHealth.value,
    };
  }

  /**
   * Get inference service metrics
   */
  async getMetrics(): Promise<any> {
    const response = await fetch(`${this.inferenceUrl}/metrics`);
    if (!response.ok) {
      throw new Error(`Failed to get metrics: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Convert File to base64 string
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Export convenience functions
export const calculateContentHash = VeriChainClient.calculateContentHash;
export const calculateContentHashFromBase64 = VeriChainClient.calculateContentHashFromBase64;
export const calculateContentHashFromUrl = VeriChainClient.calculateContentHashFromUrl;

// Export default instance
export const veriChain = new VeriChainClient();
