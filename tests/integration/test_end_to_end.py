#!/usr/bin/env python3
"""
End-to-end integration tests for the VeriChain ML pipeline.
Tests the full flow from training to inference.
"""

import os
import sys
import unittest
import subprocess
import time
import json
import requests
import base64
import numpy as np
from PIL import Image
import io

class TestEndToEnd(unittest.TestCase):
    """End-to-end tests for the VeriChain ML pipeline."""

    @classmethod
    def setUpClass(cls):
        """Set up test environment."""
        # Define paths
        cls.ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ml/train'))
        cls.inference_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../apps/inference'))
        cls.model_path = os.path.join(cls.ml_dir, 'models/model.onnx')
        cls.inference_model_path = os.path.join(cls.inference_dir, 'models/model.onnx')
        
        # Create output directories if they don't exist
        os.makedirs(os.path.join(cls.ml_dir, 'models'), exist_ok=True)
        os.makedirs(os.path.join(cls.inference_dir, 'models'), exist_ok=True)
        
        # Check if we need to train the model
        if not os.path.exists(cls.model_path):
            print("Training model...")
            cls._train_model()
        
        # Copy model to inference directory
        if not os.path.exists(cls.inference_model_path):
            print("Copying model to inference directory...")
            cls._copy_model()
        
        # Start inference server
        cls.server_process = cls._start_server()
        
        # Wait for server to start
        cls._wait_for_server()

    @classmethod
    def tearDownClass(cls):
        """Clean up test environment."""
        # Stop server
        if hasattr(cls, 'server_process') and cls.server_process:
            cls.server_process.terminate()
            cls.server_process.wait()

    @classmethod
    def _train_model(cls):
        """Train the model."""
        # Activate tf-env
        env = os.environ.copy()
        
        # Run training script with minimal parameters
        subprocess.run([
            'python', 'train_model.py',
            '--epochs', '2',
            '--samples', '100',
            '--img-size', '224'
        ], cwd=cls.ml_dir, check=True, env=env)
        
        # Run conversion
        subprocess.run([
            'python', '-m', 'tf2onnx.convert',
            '--saved-model', 'models/saved_model',
            '--output', 'models/model.onnx',
            '--opset', '17',
            '--tag', 'serve',
            '--signature_def', 'serving_default'
        ], cwd=cls.ml_dir, check=True, env=env)

    @classmethod
    def _copy_model(cls):
        """Copy model to inference directory."""
        import shutil
        os.makedirs(os.path.dirname(cls.inference_model_path), exist_ok=True)
        shutil.copy2(cls.model_path, cls.inference_model_path)

    @classmethod
    def _start_server(cls):
        """Start inference server."""
        # Start server in a separate process
        process = subprocess.Popen(
            ['node', 'server.js'],
            cwd=cls.inference_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return process

    @classmethod
    def _wait_for_server(cls):
        """Wait for server to start."""
        max_attempts = 10
        for attempt in range(max_attempts):
            try:
                response = requests.get('http://localhost:3001/healthz')
                if response.status_code == 200 and response.json().get('status') == 'healthy':
                    return
            except requests.exceptions.ConnectionError:
                pass
            
            time.sleep(1)
        
        # If we get here, server didn't start
        cls.server_process.terminate()
        cls.server_process.wait()
        stdout, stderr = cls.server_process.communicate()
        print(f"Server stdout: {stdout.decode()}")
        print(f"Server stderr: {stderr.decode()}")
        raise RuntimeError("Server failed to start")

    def _create_test_image(self, width=224, height=224, color=(100, 100, 100)):
        """Create a test image."""
        img = Image.new('RGB', (width, height), color=color)
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        buffer.seek(0)
        return buffer.getvalue()

    def test_server_health(self):
        """Test server health endpoint."""
        response = requests.get('http://localhost:3001/healthz')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertTrue(data['modelLoaded'])
        self.assertTrue(data['modelId'].startswith('0x'))

    def test_inference_with_base64(self):
        """Test inference with base64-encoded image."""
        # Create test image
        img_data = self._create_test_image()
        base64_data = base64.b64encode(img_data).decode('utf-8')
        
        # Send request
        response = requests.post(
            'http://localhost:3001/infer',
            json={'base64': base64_data}
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue('contentHash' in data)
        self.assertTrue('modelId' in data)
        self.assertTrue('scoreBps' in data)
        self.assertTrue('timestamp' in data)
        self.assertTrue('traceId' in data)
        
        # Check score is within expected range
        self.assertTrue(0 <= data['scoreBps'] <= 10000)

    def test_inference_with_invalid_base64(self):
        """Test inference with invalid base64 data."""
        # Send request with invalid base64
        response = requests.post(
            'http://localhost:3001/infer',
            json={'base64': 'invalid_base64'}
        )
        
        # Check response
        self.assertEqual(response.status_code, 500)
        data = response.json()
        self.assertTrue('error' in data)

    def test_inference_with_missing_input(self):
        """Test inference with missing input."""
        # Send request with no image data
        response = requests.post(
            'http://localhost:3001/infer',
            json={}
        )
        
        # Check response
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertTrue('error' in data)


if __name__ == '__main__':
    unittest.main()
