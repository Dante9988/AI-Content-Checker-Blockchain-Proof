import { ContractFactory } from "ethers";

// Define interfaces for contract factories with specific constructor arguments
export interface ImageVerificationFactory extends ContractFactory {
  deploy(
    minScoreThreshold: number | string,
    veriTokenAddress: string,
    verificationPrice: number | string
  ): Promise<any>;
}
