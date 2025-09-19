import { Controller, Get, Post, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post('verify')
  async writeProof(@Body() result: any) {
    try {
      return await this.blockchainService.writeProof(result);
    } catch (error) {
      throw new HttpException(
        {
          error: 'Failed to write proof to blockchain',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('verify/:contentHash')
  async readProof(@Param('contentHash') contentHash: string) {
    try {
      return await this.blockchainService.readProof(contentHash);
    } catch (error) {
      throw new HttpException(
        {
          error: 'Failed to read proof from blockchain',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('isVerified/:contentHash')
  async isImageVerified(@Param('contentHash') contentHash: string) {
    try {
      return {
        contentHash,
        isVerified: await this.blockchainService.isImageVerified(contentHash),
      };
    } catch (error) {
      throw new HttpException(
        {
          error: 'Failed to check image verification status',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify/paid')
  async storeVerificationWithPayment(@Body() result: any) {
    try {
      return await this.blockchainService.storeVerificationWithPayment(result);
    } catch (error) {
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
