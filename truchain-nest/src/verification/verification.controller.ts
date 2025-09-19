import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { VerificationService } from './verification.service';

@Controller()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Get('healthz')
  getHealth() {
    return this.verificationService.getHealth();
  }

  @Get('metrics')
  getMetrics() {
    return this.verificationService.getMetrics();
  }

  @Post('api/verify')
  async verify(@Body() body: { imageUrl?: string; base64?: string }) {
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

      return await this.verificationService.verify(imageBuffer);
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

  @Post('api/verify/detailed')
  async verifyDetailed(@Body() body: { imageUrl?: string; base64?: string }) {
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

      return await this.verificationService.verifyDetailed(imageBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'Detailed verification failed',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('api/verify/blockchain')
  async verifyAndStore(@Body() body: { imageUrl?: string; base64?: string }) {
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

      return await this.verificationService.verifyAndStore(imageBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'Verification and blockchain storage failed',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('api/verify/paid')
  async verifyWithPayment(
    @Body()
    body: { imageUrl?: string; base64?: string; from: string },
  ) {
    try {
      const { imageUrl, base64, from } = body;

      if (!imageUrl && !base64) {
        throw new HttpException(
          'Either imageUrl or base64 must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!from) {
        throw new HttpException(
          'From address is required for paid verification',
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

      return await this.verificationService.verifyWithPayment(imageBuffer, from);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'Paid verification failed',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('api/chat')
  async chat(@Body() body: { messages: any[] }) {
    throw new HttpException(
      'Chat endpoint is not implemented in this version',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
