import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto, WalletInfoDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly truChainTokenAddress: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
  ) {
    this.truChainTokenAddress = this.configService.get<string>('blockchain.truChainAddress') || '';
  }

  @ApiOperation({ summary: 'Create a new user with a generated wallet' })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    type: WalletInfoDto
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<WalletInfoDto> {
    const user = await this.usersService.create(createUserDto);
    
    return {
      address: user.walletAddress,
      privateKey: user.walletPrivateKey,
      instructions: 'Fund this wallet with TruChain tokens to use our services. Keep your private key secure.'
    };
  }

  @ApiOperation({ summary: 'Get user profile (protected)' })
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully',
    type: UserResponseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req): Promise<UserResponseDto> {
    const user = await this.usersService.findByWalletAddress(req.user.walletAddress);
    
    return {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      apiKey: user.apiKeys?.[0]?.key,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  @ApiOperation({ summary: 'Check wallet balance' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet balance retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        address: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
        balance: { type: 'string', example: '100.0' },
        hasSufficientFunds: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @Get('wallet/:address/balance')
  async getWalletBalance(@Param('address') address: string) {
    const user = await this.usersService.findByWalletAddress(address);
    if (!user) {
      return {
        address,
        balance: '0.0',
        hasSufficientFunds: false
      };
    }
    
    const balance = await this.walletService.getTokenBalance(address, this.truChainTokenAddress);
    const hasSufficientFunds = await this.walletService.hasSufficientFunds(address, this.truChainTokenAddress, '1.0');
    
    return {
      address,
      balance,
      hasSufficientFunds
    };
  }
}
