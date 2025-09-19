import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, ApiKey } from './entities';
import { CreateUserDto } from './dto/create-user.dto';
import { WalletService } from './wallet.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
    private readonly walletService: WalletService,
  ) {}

  /**
   * Create a new user with a generated wallet
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password } = createUserDto;

    // Check if email is already taken
    if (email) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Generate a wallet for the user
    const { address, privateKey } = this.walletService.generateWallet();

    // Create the user - store the original case of the wallet address
    // This is important for display purposes, but we'll use case-insensitive
    // comparisons when looking up the address
    const user = this.userRepository.create({
      email,
      passwordHash: password ? this.hashPassword(password) : undefined,
      walletAddress: address, // Keep original case for display
      walletPrivateKey: privateKey, // Should be encrypted in a real application
    });

    // Save the user
    const savedUser = await this.userRepository.save(user);
    
    // Generate an API key for the user
    await this.generateApiKey(savedUser.id, 'Default API key');

    this.logger.log(`Created user with ID ${savedUser.id} and wallet ${address}`);

    return savedUser;
  }

  /**
   * Generate a new API key for a user
   */
  async generateApiKey(userId: string, description?: string): Promise<ApiKey> {
    const user = await this.findById(userId);
    
    const apiKey = this.apiKeyRepository.create({
      key: `truc-api-${this.generateApiKeyString()}`,
      userId: user.id,
      description,
      isActive: true,
    });
    
    return this.apiKeyRepository.save(apiKey);
  }

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { id },
      relations: ['apiKeys']
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    
    return user;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: ['apiKeys']
    });
  }

  /**
   * Find a user by wallet address
   */
  async findByWalletAddress(address: string): Promise<User | null> {
    // Ethereum addresses are case-insensitive, so we need to normalize them
    // We'll use a case-insensitive comparison by converting both to lowercase
    const normalizedAddress = address.toLowerCase();
    
    // Find all users and filter by case-insensitive address
    const users = await this.userRepository.find({
      relations: ['apiKeys']
    });
    
    const user = users.find(u => u.walletAddress.toLowerCase() === normalizedAddress);
    return user || null;
  }

  /**
   * Find a user by API key
   */
  async findByApiKey(apiKey: string): Promise<User | null> {
    const key = await this.apiKeyRepository.findOne({
      where: { key: apiKey, isActive: true },
      relations: ['user', 'user.apiKeys']
    });
    
    if (!key) {
      return null;
    }
    
    // Update last used timestamp
    key.lastUsedAt = new Date();
    await this.apiKeyRepository.save(key);
    
    return key.user;
  }

  /**
   * Update a user's last login time
   */
  async updateLastLogin(id: string): Promise<User> {
    const user = await this.findById(id);
    user.lastLoginAt = new Date();
    return this.userRepository.save(user);
  }

  /**
   * Generate a random API key string
   */
  private generateApiKeyString(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash a password
   */
  private hashPassword(password: string): string {
    // In a real application, use a proper password hashing library like bcrypt
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex');
  }

  /**
   * Verify a password
   */
  verifyPassword(plainPassword: string, hashedPassword: string): boolean {
    const hash = crypto.createHash('sha256');
    hash.update(plainPassword);
    return hash.digest('hex') === hashedPassword;
  }
}