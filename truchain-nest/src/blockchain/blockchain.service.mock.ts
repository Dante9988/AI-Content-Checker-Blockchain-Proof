import { Injectable } from '@nestjs/common';

@Injectable()
export class MockBlockchainService {
  async writeProof(result: any) {
    // Mock blockchain transaction result
    return {
      success: true,
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
      timestamp: Math.floor(Date.now() / 1000),
      gasUsed: Math.floor(Math.random() * 100000) + 50000,
    };
  }

  async readProof(contentHash: string) {
    // Mock blockchain read result
    return {
      contentHash,
      modelId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      scoreBps: 3000,
      verified: true,
      timestamp: Math.floor(Date.now() / 1000),
      verifier: '0x0000000000000000000000000000000000000000',
    };
  }

  async isImageVerified(contentHash: string) {
    return true;
  }

  async storeVerificationWithPayment(result: any) {
    return this.writeProof(result);
  }
}
