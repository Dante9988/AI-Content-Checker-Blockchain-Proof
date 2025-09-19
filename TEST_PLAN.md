# VeriChain ML Testing Plan

## Overview

This document outlines the comprehensive testing strategy for the VeriChain ML pipeline, focusing on the ONNX model integration between Python training and Node.js inference.

## Test Categories

### 1. Python Unit Tests

#### Model Training and Creation Tests (`ml/train/tests/test_model.py`)
- Test model creation with and without data augmentation
- Test model training with synthetic data
- Test model export to Keras, SavedModel, and ONNX formats
- Test inference model creation without data augmentation
- Test ONNX conversion compatibility

#### Data Generation and Preprocessing Tests (`ml/train/tests/test_data.py`)
- Test synthetic dataset generation
- Test data shapes, values, and class balance
- Test data preprocessing and augmentation
- Test deterministic behavior with fixed seeds

### 2. Node.js Unit Tests

#### ONNX Model Tests (`apps/inference/tests/test_inference.js`)
- Test model loading in Node.js
- Test inference on solid color images
- Test inference on random noise images
- Test image preprocessing for different formats
- Test error handling for invalid inputs

#### API Tests (`apps/inference/tests/test_api.js`)
- Test health check endpoint
- Test metrics endpoint
- Test inference endpoint with base64 images
- Test inference endpoint with image URLs
- Test error handling for invalid requests

### 3. Integration Tests

#### End-to-End Tests (`tests/integration/test_end_to_end.py`)
- Test full pipeline from training to inference
- Test server health and readiness
- Test inference with valid images
- Test error handling for invalid inputs

## Positive Test Cases

1. **Valid Image Formats**
   - JPEG images of various sizes
   - PNG images with transparency
   - Different aspect ratios that need resizing
   - High and low resolution images

2. **Valid Input Methods**
   - Base64-encoded image data
   - Image URLs (when available)

3. **Expected Model Behavior**
   - Model returns scores between 0-1 (0-10000 basis points)
   - Consistent results for identical inputs
   - Appropriate content hash generation

## Negative Test Cases

1. **Invalid Images**
   - Empty image data
   - Corrupted image data
   - Non-image data encoded as base64
   - Extremely large images

2. **Invalid Requests**
   - Missing required parameters
   - Empty request body
   - Invalid image URLs
   - Invalid base64 encoding

3. **Error Handling**
   - Server errors
   - Model loading failures
   - Preprocessing errors

## Edge Cases

1. **Unusual Images**
   - Single-color images
   - Images with extreme aspect ratios
   - Very small or very large images
   - Images with unusual color profiles

2. **Performance Testing**
   - High concurrency requests
   - Large batch processing
   - Memory usage monitoring

## Running the Tests

### Python Tests

```bash
# Run Python unit tests
cd ml/train
python -m unittest discover tests

# Run specific test file
python -m unittest tests/test_model.py
```

### Node.js Tests

```bash
# Run Node.js tests
cd apps/inference
npm test

# Run specific test file
npx mocha tests/test_inference.js
```

### Integration Tests

```bash
# Run integration tests
cd tests/integration
python test_end_to_end.py
```

## Test Dependencies

- Python: unittest, numpy, tensorflow, PIL
- Node.js: mocha, assert, supertest, sharp

## Continuous Integration

For CI/CD pipelines, tests should be run in the following order:

1. Python unit tests
2. Node.js unit tests
3. Integration tests

Tests should be run on each pull request and before each deployment to ensure the entire pipeline works correctly.

## Test Coverage Goals

- Python code: >80% coverage
- Node.js code: >80% coverage
- API endpoints: 100% coverage

## Reporting

Test results should include:
- Pass/fail status for each test
- Code coverage metrics
- Performance metrics (inference time)
- Any warnings or deprecation notices
