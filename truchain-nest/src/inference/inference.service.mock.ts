import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class MockInferenceService {
  private modelId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  async processImageToBase64(imageBuffer: Buffer): Promise<string> {
    // Just return the buffer as base64, no processing needed for tests
    return imageBuffer.toString('base64');
  }

  calculateContentHash(imageBuffer: Buffer): string {
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    return `0x${hash}`;
  }

  async analyzeImage(imageBuffer: Buffer): Promise<{
    contentHash: string;
    modelId: string;
    scoreBps: number;
    timestamp: number;
    traceId: string;
  }> {
    // Mock the image analysis result
    return {
      contentHash: this.calculateContentHash(imageBuffer),
      modelId: this.modelId,
      scoreBps: 3000, // 30% - likely real
      timestamp: Math.floor(Date.now() / 1000),
      traceId: crypto.randomUUID(),
    };
  }

  getHealth() {
    return {
      status: 'healthy',
      gptConfigured: true,
      modelId: this.modelId,
      timestamp: Date.now(),
    };
  }

  getMetrics() {
    return {
      modelId: this.modelId,
      gptModel: 'mock-gpt-model',
      timestamp: Date.now(),
    };
  }
}
