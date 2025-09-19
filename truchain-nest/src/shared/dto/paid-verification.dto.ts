import { ApiProperty } from '@nestjs/swagger';
import { ImageInputDto } from './image-input.dto';

export class PaidVerificationDto extends ImageInputDto {
  @ApiProperty({
    description: 'Ethereum address for payment',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    required: true,
  })
  from: string;
}

export class BlockchainVerificationResultDto {
  @ApiProperty({
    description: 'Hash of the verified content (0x followed by 64 hex characters)',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    pattern: '^0x[0-9a-fA-F]{64}$'
  })
  contentHash: string;

  @ApiProperty({
    description: 'Transaction hash of the blockchain verification',
    example: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })
  transactionHash: string;

  @ApiProperty({
    description: 'Block number where the verification was stored',
    example: 12345678,
  })
  blockNumber: number;

  @ApiProperty({
    description: 'Verification score in basis points (0-10000)',
    example: 8500,
  })
  scoreBps: number;

  @ApiProperty({
    description: 'Whether the content is verified',
    example: true,
  })
  verified: boolean;
}
