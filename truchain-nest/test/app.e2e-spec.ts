import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('VeriChain API (e2e)', () => {
  let app: INestApplication;
  
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) - Health check', () => {
    return request(app.getHttpServer())
      .get('/healthz')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'healthy');
        expect(res.body).toHaveProperty('service', 'verichain-api');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/metrics (GET) - Metrics', () => {
    return request(app.getHttpServer())
      .get('/metrics')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('service', 'verichain-api');
        expect(res.body).toHaveProperty('endpoints');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/api/verify (POST) - Verify image with base64', async () => {
    // Create a test image in base64
    const testImagePath = path.resolve(__dirname, '../../../test-image.jpg');
    let base64Image: string;

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      base64Image = imageBuffer.toString('base64');
    } else {
      // Create a simple 1x1 pixel JPEG
      base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
    }

    return request(app.getHttpServer())
      .post('/api/verify')
      .send({ base64: base64Image })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('contentHash');
        expect(res.body).toHaveProperty('modelId');
        expect(res.body).toHaveProperty('scoreBps');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('verified');
      });
  });

  it('/api/verify/detailed (POST) - Get detailed verification', async () => {
    // Create a test image in base64
    const testImagePath = path.resolve(__dirname, '../../../test-image.jpg');
    let base64Image: string;

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      base64Image = imageBuffer.toString('base64');
    } else {
      // Create a simple 1x1 pixel JPEG
      base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
    }

    return request(app.getHttpServer())
      .post('/api/verify/detailed')
      .send({ base64: base64Image })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('contentHash');
        expect(res.body).toHaveProperty('modelId');
        expect(res.body).toHaveProperty('scoreBps');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('verified');
        expect(res.body).toHaveProperty('explanation');
      });
  });

  it('/api/verify/blockchain (POST) - Verify and store on blockchain', async () => {
    // Create a test image in base64
    const testImagePath = path.resolve(__dirname, '../../../test-image.jpg');
    let base64Image: string;

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      base64Image = imageBuffer.toString('base64');
    } else {
      // Create a simple 1x1 pixel JPEG
      base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
    }

    return request(app.getHttpServer())
      .post('/api/verify/blockchain')
      .send({ base64: base64Image })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('contentHash');
        expect(res.body).toHaveProperty('modelId');
        expect(res.body).toHaveProperty('scoreBps');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('verified');
        expect(res.body).toHaveProperty('blockchain');
        expect(res.body.blockchain).toHaveProperty('success');
      });
  });

  it('/api/verify/paid (POST) - Verify with payment', async () => {
    // Create a test image in base64
    const testImagePath = path.resolve(__dirname, '../../../test-image.jpg');
    let base64Image: string;

    if (fs.existsSync(testImagePath)) {
      const imageBuffer = fs.readFileSync(testImagePath);
      base64Image = imageBuffer.toString('base64');
    } else {
      // Create a simple 1x1 pixel JPEG
      base64Image = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAIBAQIBAQICAgICAgICAwUDAwMDAwYEBAMFBwYHBwcGBwcICQsJCAgKCAcHCg0KCgsMDAwMBwkODw0MDgsMDAz/2wBDAQICAgMDAwYDAwYMCAcIDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAz/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD9/KKKKAP/2Q==';
    }

    // Use the deployer address from the contract deployment
    const from = '0x93c419F0B04A0339ACffC9bab23a72929eE6ca15';

    return request(app.getHttpServer())
      .post('/api/verify/paid')
      .send({ base64: base64Image, from })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('contentHash');
        expect(res.body).toHaveProperty('modelId');
        expect(res.body).toHaveProperty('scoreBps');
        expect(res.body).toHaveProperty('timestamp');
        expect(res.body).toHaveProperty('verified');
        expect(res.body).toHaveProperty('blockchain');
        expect(res.body.blockchain).toHaveProperty('success');
      });
  });
});
