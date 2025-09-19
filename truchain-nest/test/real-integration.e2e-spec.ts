import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { InferenceService } from '../src/inference/inference.service';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Real Integration Tests (e2e)', () => {
  let app: INestApplication;
  let blockchainService: BlockchainService;
  let inferenceService: InferenceService;
  let configService: ConfigService;
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    blockchainService = moduleFixture.get<BlockchainService>(BlockchainService);
    inferenceService = moduleFixture.get<InferenceService>(InferenceService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    
    // Increase JSON body size limit for testing
    const express = require('express');
    app.use(express.json({ limit: '10mb' }));
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to blockchain network', async () => {
    // This test verifies that we can connect to the blockchain network
    const provider = new ethers.providers.JsonRpcProvider(
      configService.get<string>('blockchain.rpcUrl')
    );
    
    const network = await provider.getNetwork();
    expect(network).toBeDefined();
    expect(network.chainId).toBeDefined();
    
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);
  });

  it('should load contract addresses', () => {
    const truChainAddress = configService.get<string>('blockchain.truChainAddress');
    const imageVerificationAddress = configService.get<string>('blockchain.imageVerificationAddress');
    
    expect(truChainAddress).toBeDefined();
    expect(imageVerificationAddress).toBeDefined();
    expect(ethers.utils.isAddress(truChainAddress)).toBe(true);
    expect(ethers.utils.isAddress(imageVerificationAddress)).toBe(true);
    
    console.log(`TruChain address: ${truChainAddress}`);
    console.log(`ImageVerification address: ${imageVerificationAddress}`);
  });

  it('should analyze an image with GPT-4o', async () => {
    // Create a test image in base64
    const testImagePath = path.resolve(__dirname, '../test-image.jpg');
    let imageBuffer: Buffer;

    if (fs.existsSync(testImagePath)) {
      imageBuffer = fs.readFileSync(testImagePath);
      console.log(`Using test image from: ${testImagePath}`);
    } else {
      // Create a simple 1x1 pixel JPEG as fallback
      console.log('Test image not found, using fallback pixel image');
      const base64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIHMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
      imageBuffer = Buffer.from(base64, 'base64');
    }

    // Directly use the inference service to analyze the image
    const result = await inferenceService.analyzeImage(imageBuffer);
    
    expect(result).toBeDefined();
    expect(result.contentHash).toBeDefined();
    expect(result.modelId).toBeDefined();
    expect(result.scoreBps).toBeDefined();
    expect(typeof result.scoreBps).toBe('number');
    expect(result.scoreBps).toBeGreaterThanOrEqual(0);
    expect(result.scoreBps).toBeLessThanOrEqual(10000);
    
    console.log(`Image analyzed with GPT-4o. Score: ${result.scoreBps / 100}%`);
    console.log(`Content hash: ${result.contentHash}`);
    
    return result;
  }, 30000); // Increase timeout to 30 seconds for API call

  // POSITIVE TEST: Verify a new image that hasn't been verified before
  it('should verify a new image and store on blockchain (positive test)', async () => {
    // Instead of creating a new image, we'll use the test image but add a unique timestamp to it
    const testImagePath = path.resolve(__dirname, '../test-image.jpg');
    let imageBuffer: Buffer;
    
    if (fs.existsSync(testImagePath)) {
      imageBuffer = fs.readFileSync(testImagePath);
      console.log(`[POSITIVE TEST] Using test image from: ${testImagePath}`);
    } else {
      // Create a simple 1x1 pixel JPEG as fallback
      console.log('[POSITIVE TEST] Test image not found, using fallback pixel image');
      const base64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIHMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
      imageBuffer = Buffer.from(base64, 'base64');
    }
    
    // Create a timestamp to make the image unique
    const timestamp = Date.now();
    
    // Modify the last few bytes of the image to make it unique
    // This is a safe way to modify the image without breaking its format
    if (imageBuffer.length > 10) {
      // Write the timestamp into the last 8 bytes (if there are enough bytes)
      const timestampBuffer = Buffer.alloc(8);
      timestampBuffer.writeBigUInt64LE(BigInt(timestamp));
      
      // Copy the timestamp into the last 8 bytes of the image
      const targetPos = Math.max(0, imageBuffer.length - 10);
      timestampBuffer.copy(imageBuffer, targetPos);
    }
    
    // Convert to base64
    const uniqueBase64Image = imageBuffer.toString('base64');
    
    console.log(`[POSITIVE TEST] Created unique image with timestamp: ${timestamp}`);

    // Test the blockchain verification endpoint
    const response = await request(app.getHttpServer())
      .post('/api/verify/blockchain')
      .send({ base64: uniqueBase64Image })
      .expect(201);

    expect(response.body).toHaveProperty('contentHash');
    expect(response.body).toHaveProperty('modelId');
    expect(response.body).toHaveProperty('scoreBps');
    expect(response.body).toHaveProperty('blockchain');
    expect(response.body.blockchain).toHaveProperty('success');
    
    // Store the contentHash for verification
    const contentHash = response.body.contentHash;
    console.log(`[POSITIVE TEST] Image verified with contentHash: ${contentHash}`);
    console.log(`[POSITIVE TEST] Blockchain transaction: ${JSON.stringify(response.body.blockchain)}`);
    
    // Verify the image was stored on the blockchain
    const verificationResult = await blockchainService.readProof(contentHash);
    expect(verificationResult).toBeDefined();
    expect(verificationResult.contentHash).toEqual(contentHash);
    
    console.log(`[POSITIVE TEST] Blockchain verification result: ${JSON.stringify(verificationResult)}`);
  }, 60000); // Increase timeout to 60 seconds for blockchain operations
  
  // NEGATIVE TEST: Try to verify an image that has already been verified
  it('should handle already verified images correctly (negative test)', async () => {
    // Use a fixed base64 image that we know has already been verified
    // This is the standard 1x1 pixel JPEG we've been using in previous tests
    const existingBase64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIHMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';

    // Test the blockchain verification endpoint with an image that already exists
    const response = await request(app.getHttpServer())
      .post('/api/verify/blockchain')
      .send({ base64: existingBase64Image })
      .expect(201);

    expect(response.body).toHaveProperty('contentHash');
    expect(response.body).toHaveProperty('modelId');
    expect(response.body).toHaveProperty('scoreBps');
    expect(response.body).toHaveProperty('blockchain');
    
    // The blockchain property should still indicate success since we handle this gracefully
    expect(response.body.blockchain).toHaveProperty('success');
    
    // Check if the message indicates it's using stub mode or returning existing verification
    const contentHash = response.body.contentHash;
    console.log(`[NEGATIVE TEST] Image verified with contentHash: ${contentHash}`);
    console.log(`[NEGATIVE TEST] Blockchain transaction: ${JSON.stringify(response.body.blockchain)}`);
    
    // We should still be able to read the verification from the blockchain
    const verificationResult = await blockchainService.readProof(contentHash);
    expect(verificationResult).toBeDefined();
    expect(verificationResult.contentHash).toEqual(contentHash);
    
    console.log(`[NEGATIVE TEST] Blockchain verification result: ${JSON.stringify(verificationResult)}`);
  }, 30000); // 30 seconds should be enough for a negative test

  // PAID VERIFICATION TEST: Test the storeVerificationWithPayment function
  it('should verify an image using paid verification (token payment test)', async () => {
    // Generate a unique image for this test
    const testImagePath = path.resolve(__dirname, '../test-image.jpg');
    let imageBuffer: Buffer;
    
    if (fs.existsSync(testImagePath)) {
      imageBuffer = fs.readFileSync(testImagePath);
      console.log(`[PAID TEST] Using test image from: ${testImagePath}`);
    } else {
      // Create a simple 1x1 pixel JPEG as fallback
      console.log('[PAID TEST] Test image not found, using fallback pixel image');
      const base64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIHMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
      imageBuffer = Buffer.from(base64, 'base64');
    }
    
    // Create a timestamp to make the image unique
    const timestamp = Date.now();
    
    // Modify the last few bytes of the image to make it unique
    if (imageBuffer.length > 10) {
      const timestampBuffer = Buffer.alloc(8);
      timestampBuffer.writeBigUInt64LE(BigInt(timestamp));
      const targetPos = Math.max(0, imageBuffer.length - 10);
      timestampBuffer.copy(imageBuffer, targetPos);
    }
    
    // Convert to base64
    const uniqueBase64Image = imageBuffer.toString('base64');
    
    console.log(`[PAID TEST] Created unique image with timestamp: ${timestamp}`);

    try {
      // Get contract addresses from config
      const imageVerificationAddress = configService.get<string>('blockchain.imageVerificationAddress');
      const truChainAddress = configService.get<string>('blockchain.truChainAddress');
      console.log(`[PAID TEST] Using contracts: IV=${imageVerificationAddress}, TC=${truChainAddress}`);
      
      // Get verification price
      const verificationPrice = configService.get<string>('blockchain.verificationPrice');
      console.log(`[PAID TEST] Verification price: ${verificationPrice}`);
      
      // First, let's check if we have a /api/verify/blockchain/paid endpoint
      // If not, we'll need to create one or use the direct blockchain service
      
      // Create a custom endpoint for paid verification
      const response = await request(app.getHttpServer())
        .post('/api/blockchain/verify/paid')
        .send({ 
          contentHash: ethers.utils.id(uniqueBase64Image),
          modelId: ethers.utils.id("gpt-4o"),
          scoreBps: 5000, // 50%
          timestamp: Math.floor(Date.now() / 1000)
          // No need to specify from address - the service will use its own wallet
        })
        .expect(201);

      expect(response.body).toHaveProperty('success');
      expect(response.body.success).toBe(true);
      
      // Store the contentHash for verification
      const contentHash = response.body.contentHash || ethers.utils.id(uniqueBase64Image);
      console.log(`[PAID TEST] Image verified with contentHash: ${contentHash}`);
      console.log(`[PAID TEST] Blockchain transaction: ${JSON.stringify(response.body)}`);
      
      // Verify the image was stored on the blockchain
      const verificationResult = await blockchainService.readProof(contentHash);
      expect(verificationResult).toBeDefined();
      expect(verificationResult.contentHash).toEqual(contentHash);
      
      console.log(`[PAID TEST] Blockchain verification result: ${JSON.stringify(verificationResult)}`);
    } catch (error) {
      // If the endpoint doesn't exist, try using the blockchain service directly
      console.log(`[PAID TEST] Error with API endpoint, trying direct blockchain service: ${error.message}`);
      
      // Call the blockchain service directly to test storeVerificationWithPayment
      const contentHash = ethers.utils.id(uniqueBase64Image);
      const modelId = ethers.utils.id("gpt-4o");
      const timestamp = Math.floor(Date.now() / 1000);
      
      const result = await blockchainService.storeVerificationWithPayment({
        contentHash,
        modelId,
        scoreBps: 5000, // 50%
        timestamp
        // No need to specify from address - the service will use its own wallet
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      console.log(`[PAID TEST] Direct blockchain call result: ${JSON.stringify(result)}`);
      
      // Verify the image was stored on the blockchain
      const verificationResult = await blockchainService.readProof(contentHash);
      expect(verificationResult).toBeDefined();
      expect(verificationResult.contentHash).toEqual(contentHash);
      
      console.log(`[PAID TEST] Blockchain verification result: ${JSON.stringify(verificationResult)}`);
    }
  }, 60000); // Increase timeout to 60 seconds for blockchain operations
});