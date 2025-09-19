import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { 
  AuthResponseDto,
  WalletKeyAuthDto,
  WalletAuthDto
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Authenticate with wallet extension (UI users)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Authentication successful', 
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  @Post('wallet')
  async authenticateWithWallet(@Body() body: WalletAuthDto): Promise<AuthResponseDto> {
    const { address, signature } = body;
    
    // The message is always the same - "Sign to authenticate with TruChain"
    const message = "Sign to authenticate with TruChain";
    
    // Verify the signature directly
    const isValid = await this.authService.verifyWalletSignature(address, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }
    
    const { accessToken, expiresAt } = this.authService.generateToken(address);
    return { accessToken, address, expiresAt };
  }

  @ApiOperation({ summary: 'Authenticate with a wallet private key (server-to-server)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Authentication successful', 
    type: AuthResponseDto 
  })
  @ApiResponse({ status: 400, description: 'Invalid address or private key' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  @ApiResponse({ status: 404, description: 'User not found for this wallet' })
  @Post('server')
  async authenticateWithPrivateKey(@Body() body: WalletKeyAuthDto): Promise<AuthResponseDto> {
    const { address, privateKey } = body;
    
    const { accessToken, expiresAt } = await this.authService.authenticateWithPrivateKey(address, privateKey);
    return { accessToken, address, expiresAt };
  }
}
