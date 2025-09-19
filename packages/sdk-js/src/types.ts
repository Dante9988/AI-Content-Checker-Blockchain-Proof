/**
 * VeriChain Shared Types
 * 
 * These types define the contract-agnostic message format for verification requests
 * and results. They will be used both in the pre-contract phase and later when
 * smart contracts are implemented.
 */

export type VerifyRequest = {
  contentHash: `0x${string}`; // keccak256(file bytes)
  contentType: "image" | "video";
  modelId: `0x${string}`;
};

export type VerifyResult = {
  contentHash: `0x${string}`;
  modelId: `0x${string}`;
  scoreBps: number;      // 0..10000 (basis points)
  timestamp: number;     // unix timestamp
  traceId: string;       // for request tracing and logs
};

export type ContentType = "image" | "video";

export type ModelMetadata = {
  modelId: `0x${string}`;
  inputShape: number[];
  inputType: string;
  outputShape: number[];
  outputType: string;
  trainingAccuracy: number;
  modelSizeMB: number;
  exportedAt: string;
  framework: string;
  version: string;
};

export type InferenceRequest = {
  imageUrl?: string;
  base64?: string;
  contentType?: ContentType;
};

export type InferenceResponse = {
  contentHash: `0x${string}`;
  modelId: `0x${string}`;
  scoreBps: number;
  timestamp: number;
  traceId: string;
};

// Utility types for the verification flow
export type VerificationStatus = "pending" | "processing" | "completed" | "failed";

export type VerificationJob = {
  id: string;
  contentHash: `0x${string}`;
  contentType: ContentType;
  status: VerificationStatus;
  createdAt: number;
  completedAt?: number;
  result?: VerifyResult;
  error?: string;
};

// Types for future smart contract integration
export type ProofData = {
  contentHash: `0x${string}`;
  modelId: `0x${string}`;
  scoreBps: number;
  timestamp: number;
  validator: `0x${string}`; // validator address
  signature: `0x${string}`; // validator signature
};

export type ValidatorInfo = {
  address: `0x${string}`;
  stake: bigint;
  isActive: boolean;
  totalValidations: number;
  accuracy: number;
};
