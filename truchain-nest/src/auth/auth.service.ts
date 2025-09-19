import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_EXPIRATION: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    // In a production environment, use a proper secret from config
    this.JWT_SECRET = this.configService.get<string>('JWT_SECRET') || 'truchain-jwt-secret';
    this.JWT_EXPIRATION = this.configService.get<string>('JWT_EXPIRATION') || '1h';
  }

  /**
   * Verify a wallet signature for UI users with wallet extensions
   */
  async verifyWalletSignature(address: string, message: string, signature: string): Promise<boolean> {
    // Validate the address
    if (!ethers.utils.isAddress(address)) {
      throw new UnauthorizedException('Invalid Ethereum address');
    }
    
    try {
      // Verify the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      // Check if the recovered address matches the claimed address (case-insensitive)
      const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
      
      return isValid;
    } catch (error) {
      throw new UnauthorizedException('Invalid signature');
    }
  }

  /**
   * Generate a JWT token for an authenticated wallet
   */
  generateToken(address: string): { accessToken: string; expiresAt: number } {
    // Store the original case of the address in the token
    // but use lowercase for the subject to maintain consistency
    const payload = { 
      sub: address.toLowerCase(),
      walletAddress: address // Preserve original case
    };
    
    // Calculate expiration time
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.parseExpirationTime(this.JWT_EXPIRATION);
    const expiresAt = now * 1000 + expiresIn * 1000;
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.JWT_SECRET,
      expiresIn: this.JWT_EXPIRATION,
    });
    
    return { accessToken, expiresAt };
  }

  /**
   * Authenticate with an API key (for server-to-server API calls)
   */
  async authenticateWithApiKey(apiKey: string): Promise<{ accessToken: string; expiresAt: number; address: string }> {
    try {
      // Find user by API key
      const user = await this.usersService.findByApiKey(apiKey);
      
      if (!user) {
        throw new UnauthorizedException('Invalid API key');
      }
      
      // Update last login time
      await this.usersService.updateLastLogin(user.id);
      
      // Generate a token for the authenticated user
      const { accessToken, expiresAt } = this.generateToken(user.walletAddress);
      
      return { 
        accessToken, 
        expiresAt,
        address: user.walletAddress
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new UnauthorizedException('Authentication failed');
    }
  }
  
  /**
   * Authenticate with a private key (for server-to-server API calls)
   */
  async authenticateWithPrivateKey(address: string, privateKey: string): Promise<{ accessToken: string; expiresAt: number }> {
    try {
      // Validate the address
      if (!ethers.utils.isAddress(address)) {
        throw new BadRequestException('Invalid Ethereum address');
      }
      
      // Find user by wallet address
      const user = await this.usersService.findByWalletAddress(address);
      
      if (!user) {
        throw new NotFoundException('User not found for this wallet address');
      }
      
      // Verify that the private key matches the stored one (case-insensitive comparison)
      if (user.walletPrivateKey.toLowerCase() !== privateKey.toLowerCase()) {
        throw new UnauthorizedException('Invalid private key for this wallet');
      }
      
      // Update last login time
      await this.usersService.updateLastLogin(user.id);
      
      // Generate a token for the authenticated wallet
      return this.generateToken(address);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Parse expiration time string (e.g., '1h', '7d') to seconds
   */
  private parseExpirationTime(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default to 1 hour
    }
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 3600;
    }
  }
}
