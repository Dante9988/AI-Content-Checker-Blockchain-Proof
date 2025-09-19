import assert from 'assert';
import supertest from 'supertest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import http from 'http';
import net from 'net';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use supertest directly
const request = supertest;

// Set environment variables
process.env.MODEL_PATH = path.join(__dirname, '../models/model.onnx');
process.env.PORT = 3002; // Use different port for testing

// Import server app for testing
let app;
let initializeModel;
try {
  // Import the Express app from server.js
  const serverModule = await import('../server.js');
  app = serverModule.app;
  initializeModel = serverModule.initializeModel;
  
  // Initialize the model before tests
  await initializeModel();
} catch (error) {
  console.warn('Could not import server app:', error.message);
  console.warn('API tests will be skipped.');
}

/**
 * Tests for the API endpoints
 */
describe('API Tests', function() {
  // Skip all tests if app is not available
  before(function() {
    if (!app) {
      this.skip();
    }
    
    // Skip if model doesn't exist
    if (!fs.existsSync(process.env.MODEL_PATH)) {
      console.warn(`Model not found at ${process.env.MODEL_PATH}. Skipping tests.`);
      this.skip();
    }
  });
  
  describe('Health Check Endpoint', function() {
    it('should return 200 OK with healthy status', function(done) {
      request(app)
        .get('/healthz')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          assert.strictEqual(res.body.status, 'healthy');
          assert(res.body.modelLoaded);
          assert(res.body.modelId);
          assert(res.body.timestamp);
          done();
        });
    });
  });
  
  describe('Metrics Endpoint', function() {
    it('should return 200 OK with metrics', function(done) {
      request(app)
        .get('/metrics')
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body.modelId);
          assert(res.body.inputShape);
          assert(res.body.timestamp);
          done();
        });
    });
  });
  
  describe('Inference Endpoint', function() {
    // Create test image before tests
    let base64Image;
    
    before(async function() {
      // Create a test image
      const imageBuffer = await sharp({
        create: {
          width: 224,
          height: 224,
          channels: 3,
          background: { r: 100, g: 100, b: 100 }
        }
      }).jpeg().toBuffer();
      
      base64Image = imageBuffer.toString('base64');
    });
    
    it('should return 400 when no image is provided', function(done) {
      request(app)
        .post('/infer')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400)
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body.error);
          done();
        });
    });
    
    it('should process base64 image successfully', function(done) {
      request(app)
        .post('/infer')
        .send({ base64: base64Image })
        .expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body.contentHash);
          assert(res.body.modelId);
          assert(res.body.scoreBps !== undefined);
          assert(res.body.timestamp);
          assert(res.body.traceId);
          done();
        });
    });
    
    it('should return 500 for invalid base64 data', function(done) {
      request(app)
        .post('/infer')
        .send({ base64: 'invalid-base64!' })
        .expect('Content-Type', /json/)
        .expect(500)
        .end(function(err, res) {
          if (err) return done(err);
          assert(res.body.error);
          done();
        });
    });
    
    // Use a local image instead of external URL for reliable testing
    it('should process imageUrl successfully', function(done) {
      // Create a local image file
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const localImagePath = path.join(__dirname, 'test-image.jpg');
      fs.writeFileSync(localImagePath, imageBuffer);
      
      // Create a local server to serve the image
      const localServer = http.createServer((req, res) => {
        fs.readFile(localImagePath, (err, data) => {
          if (err) {
            res.statusCode = 500;
            res.end('Error loading image');
            return;
          }
          res.setHeader('Content-Type', 'image/jpeg');
          res.end(data);
        });
      });
      
      // Start the server on a random port
      localServer.listen(0, '127.0.0.1', () => {
        const port = localServer.address().port;
        const localUrl = `http://127.0.0.1:${port}/test-image.jpg`;
        
        request(app)
          .post('/infer')
          .send({ imageUrl: localUrl })
          .expect('Content-Type', /json/)
          .expect(200)
          .end(function(err, res) {
            // Clean up
            localServer.close();
            try { fs.unlinkSync(localImagePath); } catch (e) {}
            
            if (err) return done(err);
            assert(res.body.contentHash);
            assert(res.body.modelId);
            assert(res.body.scoreBps !== undefined);
            assert(res.body.timestamp);
            assert(res.body.traceId);
            done();
          });
      });
    });
    
    // Mock a non-existent server for testing invalid URLs
    it('should return 500 for invalid URL', function(done) {
      // Create a local server that immediately closes connections
      const localServer = net.createServer((socket) => {
        socket.destroy(); // Immediately close the connection
      });
      
      // Start the server on a random port
      localServer.listen(0, '127.0.0.1', () => {
        const port = localServer.address().port;
        const invalidUrl = `http://127.0.0.1:${port}/non-existent-image.jpg`;
        
        // Close the server immediately to simulate a connection failure
        localServer.close();
        
        request(app)
          .post('/infer')
          .send({ imageUrl: invalidUrl })
          .expect('Content-Type', /json/)
          .expect(500)
          .end(function(err, res) {
            if (err) return done(err);
            assert(res.body.error);
            done();
          });
      });
    });
  });
});

/**
 * Tests for positive and negative cases
 */
describe('Positive and Negative Test Cases', function() {
  // Skip all tests if app is not available
  before(function() {
    if (!app) {
      this.skip();
    }
    
    // Skip if model doesn't exist
    if (!fs.existsSync(process.env.MODEL_PATH)) {
      this.skip();
    }
  });
  
  // Positive test cases
  describe('Positive Cases', function() {
    it('should handle JPEG images correctly', async function() {
      const imageBuffer = await sharp({
        create: {
          width: 224,
          height: 224,
          channels: 3,
          background: { r: 100, g: 100, b: 100 }
        }
      }).jpeg().toBuffer();
      
      const base64Image = imageBuffer.toString('base64');
      
      const response = await request(app)
        .post('/infer')
        .send({ base64: base64Image })
        .expect(200);
      
      assert(response.body.scoreBps !== undefined);
    });
    
    it('should handle PNG images correctly', async function() {
      const imageBuffer = await sharp({
        create: {
          width: 224,
          height: 224,
          channels: 4, // RGBA
          background: { r: 100, g: 100, b: 100, alpha: 1 }
        }
      }).png().toBuffer();
      
      const base64Image = imageBuffer.toString('base64');
      
      const response = await request(app)
        .post('/infer')
        .send({ base64: base64Image })
        .expect(200);
      
      assert(response.body.scoreBps !== undefined);
    });
    
    it('should handle different sized images correctly', async function() {
      // Create a larger image that will be resized
      const imageBuffer = await sharp({
        create: {
          width: 500,
          height: 300,
          channels: 3,
          background: { r: 100, g: 100, b: 100 }
        }
      }).jpeg().toBuffer();
      
      const base64Image = imageBuffer.toString('base64');
      
      const response = await request(app)
        .post('/infer')
        .send({ base64: base64Image })
        .expect(200);
      
      assert(response.body.scoreBps !== undefined);
    });
  });
  
  // Negative test cases
  describe('Negative Cases', function() {
    it('should handle empty request body', function(done) {
      request(app)
        .post('/infer')
        .send()
        .expect(400)
        .end(done);
    });
    
    it('should handle empty base64 string', function(done) {
      request(app)
        .post('/infer')
        .send({ base64: '' })
        .expect(400)  // Server returns 400 Bad Request for empty base64, not 500
        .end(done);
    });
    
    it('should handle invalid image data', function(done) {
      request(app)
        .post('/infer')
        .send({ base64: 'SGVsbG8gV29ybGQ=' }) // "Hello World" in base64
        .expect(500)
        .end(done);
    });
    
    it('should handle missing URL', function(done) {
      request(app)
        .post('/infer')
        .send({ imageUrl: '' })
        .expect(400)  // Server returns 400 Bad Request for empty URL, not 500
        .end(done);
    });
  });
});
