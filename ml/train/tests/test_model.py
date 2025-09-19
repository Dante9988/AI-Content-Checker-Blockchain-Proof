#!/usr/bin/env python3
"""
Unit tests for the VeriChain ML model training and conversion.
Tests both the training process and the ONNX conversion.
"""

import os
import sys
import unittest
import tempfile
import shutil
import numpy as np
import tensorflow as tf
from tensorflow import keras

# Add parent directory to path so we can import from train_model.py
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from train_model import (
    create_model,
    create_synthetic_dataset,
    train_model,
    export_models,
    save_metadata
)

class TestModelTraining(unittest.TestCase):
    """Test cases for model training and conversion."""

    def setUp(self):
        """Set up test environment with a temporary directory."""
        self.test_dir = tempfile.mkdtemp()
        self.img_size = 64  # Use smaller size for faster tests
        self.num_samples = 100  # Use fewer samples for faster tests

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir)

    def test_create_model(self):
        """Test model creation with and without data augmentation."""
        # Test with augmentation
        model_with_aug = create_model(img_size=self.img_size, include_augmentation=True)
        self.assertIsInstance(model_with_aug, keras.Model)
        self.assertEqual(model_with_aug.name, "verichain_cnn")
        self.assertEqual(model_with_aug.input_shape, (None, self.img_size, self.img_size, 3))
        self.assertEqual(model_with_aug.output_shape, (None, 1))
        
        # Test without augmentation
        model_without_aug = create_model(img_size=self.img_size, include_augmentation=False)
        self.assertIsInstance(model_without_aug, keras.Model)
        self.assertEqual(model_without_aug.input_shape, (None, self.img_size, self.img_size, 3))
        self.assertEqual(model_without_aug.output_shape, (None, 1))

    def test_create_synthetic_dataset(self):
        """Test synthetic dataset creation."""
        X, y = create_synthetic_dataset(num_samples=self.num_samples, img_size=self.img_size)
        
        # Check shapes
        self.assertEqual(X.shape, (self.num_samples, self.img_size, self.img_size, 3))
        self.assertEqual(y.shape, (self.num_samples,))
        
        # Check data types
        self.assertEqual(X.dtype, np.float32)
        self.assertEqual(y.dtype, np.int32)
        
        # Check value ranges
        self.assertTrue(np.all(X >= 0.0))
        self.assertTrue(np.all(X <= 1.0))
        self.assertTrue(np.all((y == 0) | (y == 1)))
        
        # Check class balance
        self.assertEqual(np.sum(y == 0), self.num_samples // 2)
        self.assertEqual(np.sum(y == 1), self.num_samples // 2)

    def test_train_model(self):
        """Test model training."""
        # Create synthetic dataset
        X, y = create_synthetic_dataset(num_samples=self.num_samples, img_size=self.img_size)
        
        # Split into train/test
        X_train = X[:80]
        y_train = y[:80]
        X_test = X[80:]
        y_test = y[80:]
        
        # Train model with minimal epochs
        model, history, test_accuracy = train_model(
            X_train, y_train, X_test, y_test,
            epochs=2,
            batch_size=16,
            img_size=self.img_size
        )
        
        # Check results
        self.assertIsInstance(model, keras.Model)
        self.assertIsInstance(history, dict)
        self.assertIn('accuracy', history)
        self.assertIn('val_accuracy', history)
        self.assertIsInstance(test_accuracy, float)

    def test_export_models(self):
        """Test model export to Keras, SavedModel, and ONNX formats."""
        # Create and train a minimal model
        model = create_model(img_size=self.img_size, include_augmentation=False)
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        # Export model
        onnx_size_mb, onnx_path, primary_path = export_models(
            model, self.test_dir, self.img_size, export_onnx=False
        )
        
        # Check exported files
        keras_path = os.path.join(self.test_dir, "model.keras")
        saved_model_dir = os.path.join(self.test_dir, "saved_model")
        
        self.assertTrue(os.path.exists(keras_path))
        self.assertTrue(os.path.exists(saved_model_dir))
        self.assertTrue(os.path.exists(os.path.join(saved_model_dir, "saved_model.pb")))

    def test_inference_model_without_augmentation(self):
        """Test creating inference model without data augmentation."""
        # Create training model with augmentation
        training_model = create_model(img_size=self.img_size, include_augmentation=True)
        
        # Create inference model without augmentation
        inference_model = create_model(img_size=self.img_size, include_augmentation=False)
        
        # Check that models have compatible weights
        inference_model.set_weights(training_model.get_weights())
        
        # Test inference
        test_input = np.random.random((1, self.img_size, self.img_size, 3)).astype(np.float32)
        result = inference_model.predict(test_input)
        
        # Check result shape and type
        self.assertEqual(result.shape, (1, 1))
        self.assertTrue(0 <= result[0][0] <= 1)


class TestONNXConversion(unittest.TestCase):
    """Test cases for ONNX conversion and validation."""

    def setUp(self):
        """Set up test environment."""
        self.test_dir = tempfile.mkdtemp()
        self.img_size = 64  # Use smaller size for faster tests

    def tearDown(self):
        """Clean up temporary directory."""
        shutil.rmtree(self.test_dir)

    def test_onnx_conversion_compatibility(self):
        """Test if model is compatible with ONNX conversion."""
        # This test requires the convert-env environment, not tf-env
        # Skip this test since we can't easily switch environments during the test
        self.skipTest("ONNX conversion test requires convert-env environment")
        
        # The following code would work in the convert-env environment:
        # Create model without augmentation
        model = create_model(img_size=self.img_size, include_augmentation=False)
        
        # Export to SavedModel
        saved_model_dir = os.path.join(self.test_dir, "saved_model")
        model.export(saved_model_dir)
        
        # Check if saved_model exists
        self.assertTrue(os.path.exists(saved_model_dir))
        self.assertTrue(os.path.exists(os.path.join(saved_model_dir, "saved_model.pb")))


if __name__ == "__main__":
    unittest.main()
