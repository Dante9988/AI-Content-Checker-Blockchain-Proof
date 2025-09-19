import { ApiProperty } from '@nestjs/swagger';

export class VerificationResultDto {
  @ApiProperty({
    description: 'Hash of the verified content (0x followed by 64 hex characters)',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    pattern: '^0x[0-9a-fA-F]{64}$'
  })
  contentHash: string;

  @ApiProperty({
    description: 'ID of the model used for verification',
    example: 'gpt-4o',
  })
  modelId: string;

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

  @ApiProperty({
    description: 'Timestamp of verification',
    example: '2025-09-19T12:34:56.789Z',
  })
  timestamp: string;
}

export class DetailedVerificationResultDto extends VerificationResultDto {
  @ApiProperty({
    description: 'Detailed explanation of verification result',
    example: 'This image shows signs of AI generation based on...',
  })
  explanation: string;
}
