import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InferenceService } from '../inference/inference.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import OpenAI from 'openai';
import * as crypto from 'crypto';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private openai: OpenAI;

  constructor(
    private configService: ConfigService,
    private inferenceService: InferenceService,
    private blockchainService: BlockchainService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async verify(imageBuffer: Buffer) {
    const startTime = Date.now();
    const traceId = crypto.randomUUID();

    this.logger.log({ traceId, msg: 'Verification request received' });

    try {
      // Use inference service to analyze image
      const result = await this.inferenceService.analyzeImage(imageBuffer);

      // Add blockchain-ready verification data
      const minScoreThreshold = this.configService.get<number>(
        'verification.minScoreThreshold',
      );
      const verificationData = {
        ...result,
        verified: result.scoreBps < minScoreThreshold, // Less than threshold likelihood of being AI-generated
        verificationTime: Math.floor(Date.now() / 1000),
        verifierAddress: this.configService.get<string>('blockchain.imageVerificationAddress')
      };

      const latency = Date.now() - startTime;

      this.logger.log({
        traceId,
        contentHash: result.contentHash,
        scoreBps: result.scoreBps,
        verified: verificationData.verified,
        latency,
        msg: 'Verification completed',
      });

      return verificationData;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error({
        traceId,
        error: error.message,
        stack: error.stack,
        latency,
        msg: 'Verification failed',
      });
      throw error;
    }
  }

  async verifyDetailed(imageBuffer: Buffer) {
    const startTime = Date.now();
    const traceId = crypto.randomUUID();

    this.logger.log({ traceId, msg: 'Detailed verification request received' });

    try {
      // First get the basic verification from inference service
      const result = await this.inferenceService.analyzeImage(imageBuffer);

      // Get detailed explanation from OpenAI
      const imageBase64 = await this.inferenceService.processImageToBase64(
        imageBuffer,
      );

      const openaiResponse = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at detecting AI-generated images. Provide a detailed explanation of why you believe an image is real or AI-generated. Focus on telltale signs like unnatural lighting, inconsistent shadows, strange textures, anatomical errors, or other artifacts.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: "Analyze this image and explain in detail why you think it's real or AI-generated. Be specific about the visual elements that led to your conclusion.",
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      });

      const explanation = openaiResponse.choices[0].message.content;
      const latency = Date.now() - startTime;

      // Add blockchain-ready verification data with explanation
      const minScoreThreshold = this.configService.get<number>(
        'verification.minScoreThreshold',
      );
      const detailedResult = {
        ...result,
        verified: result.scoreBps < minScoreThreshold, // Less than threshold likelihood of being AI-generated
        verificationTime: Math.floor(Date.now() / 1000),
        verifierAddress: this.configService.get<string>('blockchain.imageVerificationAddress'),
        explanation,
      };

      this.logger.log({
        traceId,
        contentHash: result.contentHash,
        scoreBps: result.scoreBps,
        verified: detailedResult.verified,
        latency,
        msg: 'Detailed verification completed',
      });

      return detailedResult;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error({
        traceId,
        error: error.message,
        stack: error.stack,
        latency,
        msg: 'Detailed verification failed',
      });
      throw error;
    }
  }

  async verifyAndStore(imageBuffer: Buffer) {
    const result = await this.verify(imageBuffer);
    const blockchainResult = await this.blockchainService.writeProof(result);
    return { ...result, blockchain: blockchainResult };
  }

  async verifyWithPayment(imageBuffer: Buffer, from: string) {
    const result = await this.verify(imageBuffer);
    const blockchainResult = await this.blockchainService.storeVerificationWithPayment({
      ...result,
      from,
    });
    return { ...result, blockchain: blockchainResult };
  }

  getHealth() {
    return {
      status: 'healthy',
      service: 'verichain-api',
      timestamp: Date.now(),
      openaiConfigured: !!this.configService.get<string>('openai.apiKey'),
    };
  }

  getMetrics() {
    return {
      service: 'verichain-api',
      endpoints: [
        '/api/verify',
        '/api/verify/detailed',
        '/api/verify/blockchain',
        '/api/verify/paid',
        '/healthz',
        '/metrics',
      ],
      timestamp: Date.now(),
    };
  }
}
