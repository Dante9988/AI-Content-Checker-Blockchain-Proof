import { Controller, Get, Post, Body, Param, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { VerificationResultDto, BlockchainVerificationResultDto } from '../shared/dto';
import { BlockchainService } from './blockchain.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('blockchain')
@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}
  
  @ApiOperation({ summary: 'Get user wallet information (protected endpoint)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns wallet information for the authenticated user',
    schema: {
      type: 'object',
      properties: {
        walletAddress: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
        authenticated: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2025-09-19T12:34:56.789Z' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token missing or invalid' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('wallet-info')
  getWalletInfo(@Req() req) {
    return {
      walletAddress: req.user.walletAddress,
      authenticated: true,
      timestamp: new Date().toISOString()
    };
  }

  @ApiOperation({ summary: 'Write verification proof to blockchain' })
  @ApiBody({ type: VerificationResultDto })
  @ApiResponse({ status: 200, description: 'Proof written to blockchain successfully', type: BlockchainVerificationResultDto })
  @ApiResponse({ status: 400, description: 'Invalid content hash format' })
  @ApiResponse({ status: 500, description: 'Failed to write proof to blockchain' })
  @Post('verify')
  async writeProof(@Body() result: any) {
    try {
      // Validate contentHash format (should be 0x followed by 64 hex characters)
      if (!result.contentHash || !result.contentHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        throw new HttpException(
          {
            error: 'Invalid content hash format',
            details: 'Content hash must be 0x followed by 64 hex characters',
            providedHash: result.contentHash
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.blockchainService.writeProof(result);
    } catch (error) {
      // If it's already an HttpException, just rethrow it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          error: 'Failed to write proof to blockchain',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Read verification proof from blockchain' })
  @ApiParam({
    name: 'contentHash',
    description: 'Hash of the content to check verification for (0x followed by 64 hex characters)',
    type: 'string',
    required: true,
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  })
  @ApiResponse({ status: 200, description: 'Verification proof retrieved successfully', type: BlockchainVerificationResultDto })
  @ApiResponse({ status: 400, description: 'Invalid content hash format' })
  @ApiResponse({ status: 500, description: 'Failed to read proof from blockchain' })
  @Get('verify/:contentHash')
  async readProof(@Param('contentHash') contentHash: string) {
    try {
      // Validate contentHash format (should be 0x followed by 64 hex characters)
      if (!contentHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        throw new HttpException(
          {
            error: 'Invalid content hash format',
            details: 'Content hash must be 0x followed by 64 hex characters',
            providedHash: contentHash
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.blockchainService.readProof(contentHash);
    } catch (error) {
      // If it's already an HttpException, just rethrow it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          error: 'Failed to read proof from blockchain',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Check if an image is verified on blockchain' })
  @ApiParam({
    name: 'contentHash',
    description: 'Hash of the content to check verification status (0x followed by 64 hex characters)',
    type: 'string',
    required: true,
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  })
  @ApiResponse({ status: 200, description: 'Verification status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid content hash format' })
  @ApiResponse({ status: 500, description: 'Failed to check verification status' })
  @Get('isVerified/:contentHash')
  async isImageVerified(@Param('contentHash') contentHash: string) {
    try {
      // Validate contentHash format (should be 0x followed by 64 hex characters)
      if (!contentHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        throw new HttpException(
          {
            error: 'Invalid content hash format',
            details: 'Content hash must be 0x followed by 64 hex characters',
            providedHash: contentHash
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return {
        contentHash,
        isVerified: await this.blockchainService.isImageVerified(contentHash),
      };
    } catch (error) {
      // If it's already an HttpException, just rethrow it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          error: 'Failed to check image verification status',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiOperation({ summary: 'Store verification with token payment' })
  @ApiBody({
    schema: {
      allOf: [
        { $ref: '#/components/schemas/VerificationResultDto' },
        {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Ethereum address for payment' },
          },
          required: ['from'],
        },
      ],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification stored with payment successfully', type: BlockchainVerificationResultDto })
  @ApiResponse({ status: 400, description: 'Invalid content hash format' })
  @ApiResponse({ status: 500, description: 'Failed to store verification with payment' })
  @Post('verify/paid')
  async storeVerificationWithPayment(@Body() result: any) {
    try {
      // Validate contentHash format (should be 0x followed by 64 hex characters)
      if (!result.contentHash || !result.contentHash.match(/^0x[0-9a-fA-F]{64}$/)) {
        throw new HttpException(
          {
            error: 'Invalid content hash format',
            details: 'Content hash must be 0x followed by 64 hex characters',
            providedHash: result.contentHash
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      
      return await this.blockchainService.storeVerificationWithPayment(result);
    } catch (error) {
      // If it's already an HttpException, just rethrow it
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        {
          error: 'Failed to store verification with payment',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
