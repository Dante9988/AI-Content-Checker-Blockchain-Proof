import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ImageInputDto } from '../shared/dto';
import { InferenceService } from './inference.service';

@ApiTags('inference')
@Controller('inference')
export class InferenceController {
  constructor(private readonly inferenceService: InferenceService) {}
  
  /**
   * Validates if a string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validates if a string is valid base64
   */
  private isValidBase64(base64: string): boolean {
    // Check if it's a data URL (e.g., data:image/jpeg;base64,/9j/4AAQ...)
    if (base64.startsWith('data:')) {
      const parts = base64.split(',');
      if (parts.length !== 2) return false;
      base64 = parts[1];
    }
    
    try {
      // Try to decode and check if it's valid
      return /^[A-Za-z0-9+/]*={0,2}$/.test(base64);
    } catch (error) {
      return false;
    }
  }

  @ApiOperation({ summary: 'Get inference service health status' })
  @ApiResponse({ status: 200, description: 'Inference service is healthy' })
  @Get('healthz')
  getHealth() {
    return this.inferenceService.getHealth();
  }

  @ApiOperation({ summary: 'Get inference service metrics' })
  @ApiResponse({ status: 200, description: 'Returns inference service usage metrics' })
  @Get('metrics')
  getMetrics() {
    return this.inferenceService.getMetrics();
  }

  @ApiOperation({ summary: 'Analyze an image using AI inference' })
  @ApiBody({ type: ImageInputDto })
  @ApiResponse({ status: 200, description: 'Image analysis result' })
  @ApiResponse({ status: 400, description: 'Bad request - missing image data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('infer')
  async infer(@Body() body: ImageInputDto) {
    try {
      const { imageUrl, base64 } = body;

      if (!imageUrl && !base64) {
        throw new HttpException(
          {
            error: 'Bad Request',
            details: 'Either imageUrl or base64 must be provided'
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Validate URL format if provided
      if (imageUrl && !this.isValidUrl(imageUrl)) {
        throw new HttpException(
          {
            error: 'Bad Request',
            details: 'Invalid URL format',
            providedUrl: imageUrl
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Validate base64 format if provided
      if (base64 && !this.isValidBase64(base64)) {
        throw new HttpException(
          {
            error: 'Bad Request',
            details: 'Invalid base64 format'
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      let imageBuffer: Buffer;

      // Handle base64 input
      if (base64) {
        try {
          imageBuffer = Buffer.from(base64, 'base64');
          if (imageBuffer.length === 0) {
            throw new Error('Empty buffer');
          }
        } catch (error) {
          throw new HttpException(
            {
              error: 'Bad Request',
              details: 'Invalid base64 data'
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      // Handle URL input
      else if (imageUrl) {
        try {
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new HttpException(
              {
                error: 'Bad Request',
                details: `Failed to fetch image: ${response.statusText}`,
                status: response.status
              },
              HttpStatus.BAD_REQUEST,
            );
          }
          imageBuffer = Buffer.from(await response.arrayBuffer());
          if (imageBuffer.length === 0) {
            throw new Error('Empty image data');
          }
        } catch (error) {
          if (error instanceof HttpException) {
            throw error;
          }
          throw new HttpException(
            {
              error: 'Bad Request',
              details: `Failed to fetch image: ${error.message}`
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return await this.inferenceService.analyzeImage(imageBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'Internal Server Error',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
