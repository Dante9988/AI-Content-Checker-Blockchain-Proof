# VeriChain ML Testing Documentation

## Overview

This document outlines the comprehensive testing strategy implemented for the VeriChain ML pipeline, focusing on the ONNX model integration between Python training and Node.js inference.

## Test Categories

### 1. Python Unit Tests

#### Model Training and Creation Tests (`ml/train/tests/test_model.py`)
- Tests model creation with and without data augmentation
- Tests model training with synthetic data
- Tests model export to Keras, SavedModel formats
- Tests inference model creation without data augmentation

#### Data Generation and Preprocessing Tests (`ml/train/tests/test_data.py`)
- Tests synthetic dataset generation
- Tests data shapes, values, and class balance
- Tests data preprocessing
- Tests deterministic behavior with fixed seeds

### 2. Node.js Unit Tests

#### ONNX Model Tests (`apps/inference/tests/test_inference.js`)
- Tests model loading in Node.js
- Tests inference on solid color images
- Tests inference on random noise images
- Tests image preprocessing for different formats
- Tests error handling for invalid inputs

#### API Tests (`apps/inference/tests/test_api.js`)
- Tests health check endpoint
- Tests metrics endpoint
- Tests inference endpoint with base64 images
- Tests inference endpoint with image URLs
- Tests error handling for invalid requests

## Running the Tests

### Python Tests

```bash
# Run Python unit tests
cd ml/train
source tf-env/bin/activate
python -m unittest tests/test_model.py
python -m unittest tests/test_data.py
```

### Node.js Tests

```bash
# Run Node.js tests
cd apps/inference
yarn test:inference
yarn test:api
```

## Test Coverage

Our tests cover:

1. **Model Training**:
   - Model creation with and without data augmentation
   - Training on synthetic data
   - Model export to different formats

2. **ONNX Conversion**:
   - Conversion from TensorFlow SavedModel to ONNX format
   - Handling of unsupported operations

3. **Node.js Integration**:
   - Loading ONNX models in Node.js
   - Processing images with the model
   - API endpoints for inference

4. **Error Handling**:
   - Invalid image data
   - Empty inputs
   - Network failures

## Key Fixes Implemented

1. **Data Augmentation Removal**: Modified the model creation process to exclude data augmentation layers during export, as these operations are not supported in ONNX Runtime for Node.js.

2. **ES Module Compatibility**: Updated test files to use ES module imports instead of CommonJS require statements to match the project's module system.

3. **Local Testing for Network Operations**: Implemented local HTTP servers for testing URL-based image loading to avoid external dependencies.

4. **API Endpoint Testing**: Created comprehensive tests for all API endpoints, including positive and negative test cases.

## Test Results

All tests are now passing, confirming that:

1. The model training pipeline works correctly
2. The ONNX conversion process produces a valid model
3. The Node.js application can load and use the ONNX model
4. The API endpoints handle various inputs correctly
5. Error handling is robust

## Future Testing Improvements

1. **Integration Tests**: Implement end-to-end tests that cover the full pipeline from training to inference
2. **Performance Testing**: Add tests for throughput and latency under load
3. **Continuous Integration**: Set up automated testing in CI/CD pipelines
4. **Test Coverage Metrics**: Implement code coverage reporting for both Python and JavaScript code
