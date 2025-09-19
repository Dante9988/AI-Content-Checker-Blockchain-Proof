import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false
  })
  email?: string;

  @ApiProperty({
    description: 'User wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  walletAddress: string;

  @ApiProperty({
    description: 'API key for authentication',
    example: 'truc-api-550e8400e29b41d4a716446655440000',
    required: false
  })
  apiKey?: string;

  @ApiProperty({
    description: 'User creation date',
    example: '2025-09-19T12:34:56.789Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last login date',
    example: '2025-09-19T12:34:56.789Z',
    required: false
  })
  lastLoginAt?: Date;
}

export class WalletInfoDto {
  @ApiProperty({
    description: 'Wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  address: string;

  @ApiProperty({
    description: 'Private key for the wallet (only shown once)',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  })
  privateKey: string;

  @ApiProperty({
    description: 'Instructions for funding the wallet',
    example: 'Fund this wallet with TruChain tokens to use our services'
  })
  instructions: string;
}
