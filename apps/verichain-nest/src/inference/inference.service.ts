import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

@Injectable()
export class InferenceService implements OnModuleInit {
  private readonly logger = new Logger(InferenceService.name);
  private openai: OpenAI;
  private modelId: string;
  private readonly IMG_SIZE = 224;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeGPT();
  }

  async initializeGPT() {
    try {
      const apiKey = this.configService.get<string>('openai.apiKey');
      const gptModel = this.configService.get<string>('openai.model');

      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }

      this.logger.log(`Initializing OpenAI client with model ${gptModel}`);

      // Initialize OpenAI client
      this.openai = new OpenAI({ apiKey });

      // Generate a fixed model ID based on the GPT model name
      const modelIdBase = `gpt-verification-${gptModel}`;
      const hash = crypto.createHash('sha256').update(modelIdBase).digest('hex');
      this.modelId = `0x${hash}`;

      this.logger.log(`Model ID: ${this.modelId}`);
    } catch (error) {
      this.logger.error('Failed to initialize GPT:', error);
      throw error;
    }
  }

  async processImageToBase64(imageBuffer: Buffer): Promise<string> {
    try {
      // Resize image to standard size
      const processed = await sharp(imageBuffer)
        .resize(this.IMG_SIZE, this.IMG_SIZE, { fit: 'cover' })
        .toBuffer();

      // Convert to base64
      return processed.toString('base64');
    } catch (error) {
      this.logger.error('Image processing failed:', error);
      throw new Error('Image processing failed');
    }
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
    const startTime = Date.now();
    const traceId = crypto.randomUUID();

    this.logger.log({ traceId, msg: 'Verification request received' });

    try {
      // Calculate content hash
      const contentHash = this.calculateContentHash(imageBuffer);

      // Process image to base64 for GPT
      const imageBase64 = await this.processImageToBase64(imageBuffer);
      const gptModel = this.configService.get<string>('openai.model');
      const gptPrompt = this.configService.get<string>('openai.prompt');

      // Create GPT prompt for image analysis
      const response = await this.openai.chat.completions.create({
        model: gptModel,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI image verification expert. Analyze the provided image and determine if it\'s real or AI-generated. Respond with a percentage score from 0 to 100, where 0% means definitely real and 100% means definitely AI-generated. Only respond with a single number (no % sign).',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Is this image real or AI-generated? Respond with a percentage score from 0 to 100.',
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
        max_completion_tokens: 10,
      });

      // Parse GPT response to get score
      const gptResponse = response.choices[0].message.content.trim();
      let score = parseFloat(gptResponse);

      // Ensure score is valid
      if (isNaN(score) || score < 0 || score > 100) {
        this.logger.warn({
          traceId,
          gptResponse,
          msg: 'Invalid GPT score, defaulting to 50%',
        });
        score = 50;
      }

      // Convert to basis points (0-10000)
      const scoreBps = Math.round(score * 100);

      const result = {
        contentHash,
        modelId: this.modelId,
        scoreBps,
        timestamp: Math.floor(Date.now() / 1000),
        traceId,
      };

      const latency = Date.now() - startTime;

      this.logger.log({
        traceId,
        contentHash,
        scoreBps,
        latency,
        msg: 'Verification completed successfully',
      });

      return result;
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

  getHealth() {
    return {
      status: 'healthy',
      gptConfigured: this.openai !== null,
      modelId: this.modelId,
      timestamp: Date.now(),
    };
  }

  getMetrics() {
    return {
      modelId: this.modelId,
      gptModel: this.configService.get<string>('openai.model'),
      timestamp: Date.now(),
    };
  }
}
