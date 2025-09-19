import { ApiProperty } from '@nestjs/swagger';

export class WalletAuthDto {
  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    pattern: '^0x[a-fA-F0-9]{40}$'
  })
  address: string;

  @ApiProperty({
    description: 'Signature of the message "Sign to authenticate with TruChain"',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1c'
  })
  signature: string;
}

export class WalletKeyAuthDto {
  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
    pattern: '^0x[a-fA-F0-9]{40}$'
  })
  address: string;

  @ApiProperty({
    description: 'Private key for the wallet (only used for server-to-server authentication)',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  })
  privateKey: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  accessToken: string;

  @ApiProperty({
    description: 'Authenticated wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  })
  address: string;

  @ApiProperty({
    description: 'Expiration timestamp for the token',
    example: 1695146189123
  })
  expiresAt: number;
}
