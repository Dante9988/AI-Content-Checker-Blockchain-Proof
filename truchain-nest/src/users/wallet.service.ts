import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly provider: ethers.providers.JsonRpcProvider;
  
  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('blockchain.rpcUrl') || 'https://rpc.cc3-testnet.creditcoin.network';
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Generate a new Ethereum wallet for a user
   */
  generateWallet(): { address: string; privateKey: string } {
    try {
      // Create a new random wallet
      const wallet = ethers.Wallet.createRandom();
      
      this.logger.log(`Generated new wallet: ${wallet.address}`);
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      this.logger.error('Failed to generate wallet', error);
      throw new Error('Failed to generate wallet');
    }
  }

  /**
   * Get the TruChain token balance for an address
   */
  async getTokenBalance(address: string, tokenAddress: string): Promise<string> {
    try {
      // Basic ERC20 ABI for balanceOf function
      const minAbi = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
        },
      ];

      const tokenContract = new ethers.Contract(tokenAddress, minAbi, this.provider);
      const balance = await tokenContract.balanceOf(address);
      
      return ethers.utils.formatUnits(balance, 18); // Assuming 18 decimals for the token
    } catch (error) {
      this.logger.error(`Failed to get token balance for ${address}`, error);
      return '0.0';
    }
  }

  /**
   * Verify if a wallet has sufficient funds
   */
  async hasSufficientFunds(address: string, tokenAddress: string, requiredAmount: string): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(address, tokenAddress);
      const balanceBN = ethers.utils.parseUnits(balance, 18);
      const requiredBN = ethers.utils.parseUnits(requiredAmount, 18);
      
      return balanceBN.gte(requiredBN);
    } catch (error) {
      this.logger.error(`Failed to check funds for ${address}`, error);
      return false;
    }
  }
}
