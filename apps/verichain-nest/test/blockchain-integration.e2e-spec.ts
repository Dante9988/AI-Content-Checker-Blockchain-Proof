import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BlockchainService } from '../src/blockchain/blockchain.service';
import { MockBlockchainService } from '../src/blockchain/blockchain.service.mock';
import { InferenceService } from '../src/inference/inference.service';
import { MockInferenceService } from '../src/inference/inference.service.mock';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

describe('Blockchain Integration Tests (e2e)', () => {
  let app: INestApplication;
  let blockchainService: BlockchainService;
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
    })
    .overrideProvider(InferenceService)
    .useClass(MockInferenceService)
    .overrideProvider(BlockchainService)
    .useClass(MockBlockchainService)
    .compile();

    app = moduleFixture.createNestApplication();
    blockchainService = moduleFixture.get<BlockchainService>(BlockchainService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    
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

  it('should verify an image and store on blockchain', async () => {
    // Create a test image in base64
    const testImagePath = path.resolve(__dirname, '../../test-image.jpg');
    let base64Image: string;

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      base64Image = imageBuffer.toString('base64');
    } else {
      // Create a simple 1x1 pixel JPEG
      base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
    }

    // Test the blockchain verification endpoint
    const response = await request(app.getHttpServer())
      .post('/api/verify/blockchain')
      .send({ base64: base64Image })
      .expect(201);

    expect(response.body).toHaveProperty('contentHash');
    expect(response.body).toHaveProperty('modelId');
    expect(response.body).toHaveProperty('scoreBps');
    expect(response.body).toHaveProperty('blockchain');
    expect(response.body.blockchain).toHaveProperty('success');
    
    // Store the contentHash for the next test
    const contentHash = response.body.contentHash;
    console.log(`Image verified with contentHash: ${contentHash}`);
    
    // Verify the image was stored on the blockchain
    const verificationResult = await blockchainService.readProof(contentHash);
    expect(verificationResult).toBeDefined();
    expect(verificationResult.contentHash).toEqual(contentHash);
  }, 30000); // Increase timeout to 30 seconds for blockchain operations
});
