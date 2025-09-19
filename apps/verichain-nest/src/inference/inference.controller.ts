import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { InferenceService } from './inference.service';

@Controller('inference')
export class InferenceController {
  constructor(private readonly inferenceService: InferenceService) {}

  @Get('healthz')
  getHealth() {
    return this.inferenceService.getHealth();
  }

  @Get('metrics')
  getMetrics() {
    return this.inferenceService.getMetrics();
  }

  @Post('infer')
  async infer(@Body() body: { imageUrl?: string; base64?: string }) {
    try {
      const { imageUrl, base64 } = body;

      if (!imageUrl && !base64) {
        throw new HttpException(
          'Either imageUrl or base64 must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      let imageBuffer: Buffer;

      // Handle base64 input
      if (base64) {
        imageBuffer = Buffer.from(base64, 'base64');
      }
      // Handle URL input
      else if (imageUrl) {
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      }

      return await this.inferenceService.analyzeImage(imageBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'Verification failed',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
