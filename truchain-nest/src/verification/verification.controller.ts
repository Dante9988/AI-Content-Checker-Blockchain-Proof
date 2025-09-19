import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ImageInputDto, PaidVerificationDto, VerificationResultDto, DetailedVerificationResultDto } from '../shared/dto';
import { VerificationService } from './verification.service';

@ApiTags('verification')
@Controller()
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}
  
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
  
  /**
   * Extracts base64 data from a data URL or returns the original string if it's not a data URL
   */
  private extractBase64Data(base64: string): string {
    if (base64.startsWith('data:')) {
      const parts = base64.split(',');
      if (parts.length !== 2) {
        throw new Error('Invalid data URL format');
      }
      return parts[1];
    }
    return base64;
  }

  @ApiOperation({ summary: 'Get API health status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  @Get('healthz')
  getHealth() {
    return this.verificationService.getHealth();
  }

  @ApiOperation({ summary: 'Get API metrics' })
  @ApiResponse({ status: 200, description: 'Returns API usage metrics' })
  @Get('metrics')
  getMetrics() {
    return this.verificationService.getMetrics();
  }

  @ApiOperation({ summary: 'Verify an image' })
  @ApiBody({ type: ImageInputDto })
  @ApiResponse({ status: 200, description: 'Image verification result', type: VerificationResultDto })
  @ApiResponse({ status: 400, description: 'Bad request - missing image data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('api/verify')
  async verify(@Body() body: ImageInputDto) {
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
          const base64Data = this.extractBase64Data(base64);
          imageBuffer = Buffer.from(base64Data, 'base64');
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

      return await this.verificationService.verify(imageBuffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          error: 'Internal Server Error',
          details: error.message,
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Verify an image with detailed analysis' })
  @ApiBody({ type: ImageInputDto })
  @ApiResponse({ status: 200, description: 'Detailed image verification result with explanation', type: DetailedVerificationResultDto })
  @ApiResponse({ status: 400, description: 'Bad request - missing image data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('api/verify/detailed')
  async verifyDetailed(@Body() body: ImageInputDto) {
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
          const base64Data = this.extractBase64Data(base64);
          imageBuffer = Buffer.from(base64Data, 'base64');
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

      return await this.verificationService.verifyDetailed(imageBuffer);
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

  @ApiOperation({ summary: 'Verify an image and store result on blockchain' })
  @ApiBody({ type: ImageInputDto })
  @ApiResponse({ status: 200, description: 'Blockchain verification result with transaction details' })
  @ApiResponse({ status: 400, description: 'Bad request - missing image data' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('api/verify/blockchain')
  async verifyAndStore(@Body() body: ImageInputDto) {
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
          const base64Data = this.extractBase64Data(base64);
          imageBuffer = Buffer.from(base64Data, 'base64');
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

      return await this.verificationService.verifyAndStore(imageBuffer);
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

  @ApiOperation({ summary: 'Verify an image with token payment' })
  @ApiBody({ type: PaidVerificationDto })
  @ApiResponse({ status: 200, description: 'Paid verification result with payment details' })
  @ApiResponse({ status: 400, description: 'Bad request - missing image data or payment address' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Post('api/verify/paid')
  async verifyWithPayment(
    @Body()
    body: PaidVerificationDto,
  ) {
    try {
      const { imageUrl, base64, from } = body;

      if (!imageUrl && !base64) {
        throw new HttpException(
          {
            error: 'Bad Request',
            details: 'Either imageUrl or base64 must be provided'
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!from) {
        throw new HttpException(
          {
            error: 'Bad Request',
            details: 'From address is required for paid verification'
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(from)) {
        throw new HttpException(
          {
            error: 'Bad Request',
            details: 'Invalid Ethereum address format',
            providedAddress: from
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
          const base64Data = this.extractBase64Data(base64);
          imageBuffer = Buffer.from(base64Data, 'base64');
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

      return await this.verificationService.verifyWithPayment(imageBuffer, from);
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

  @ApiOperation({ summary: 'Chat with AI about verification (not implemented)' })
  @ApiBody({
    description: 'Chat messages',
    schema: {
      type: 'object',
      properties: {
        messages: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant', 'system'] },
              content: { type: 'string' }
            }
          }
        },
      },
      required: ['messages'],
    },
  })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  @Post('api/chat')
  async chat(@Body() body: { messages: any[] }) {
    throw new HttpException(
      'Chat endpoint is not implemented in this version',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
