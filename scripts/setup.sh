#!/bin/bash

# VeriChain Setup Script
# This script sets up the VeriChain project environment

set -e

echo "🚀 Setting up VeriChain project..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    echo "❌ Yarn not found. Please install Yarn first."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.10+ first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
yarn install

# Build SDK package
echo "🔨 Building SDK package..."
yarn workspace @verichain/sdk-js build

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p apps/inference/models
mkdir -p ml/train/models

# Create environment files
echo "🔧 Creating environment files..."

if [ ! -f "apps/web/.env" ]; then
    echo "OPENAI_API_KEY=your_openai_key_here" > apps/web/.env
    echo "⚠️  Created apps/web/.env - please add your OpenAI API key"
fi

if [ ! -f "apps/inference/.env" ]; then
    echo "MODEL_PATH=./models/model.onnx" > apps/inference/.env
    echo "✅ Created apps/inference/.env"
fi

# Set up Python environment
echo "🐍 Setting up Python environment..."

cd ml/train

if command -v conda &> /dev/null; then
    echo "📦 Using conda for environment setup..."
    if conda env list | grep -q "verichain-ml"; then
        echo "✅ Conda environment 'verichain-ml' already exists"
    else
        echo "📦 Creating conda environment..."
        conda env create -f env.yml
    fi
    echo "💡 To activate: conda activate verichain-ml"
else
    echo "📦 Using pip for environment setup..."
    if [ ! -d "venv" ]; then
        echo "📦 Creating virtual environment..."
        python3 -m venv venv
    fi
    echo "💡 To activate: source venv/bin/activate (Linux/Mac) or venv\\Scripts\\activate (Windows)"
fi

echo "📦 Installing Python dependencies..."
if command -v conda &> /dev/null && conda env list | grep -q "verichain-ml"; then
    conda activate verichain-ml && pip install -r requirements.txt
else
    source venv/bin/activate && pip install -r requirements.txt
fi

cd ../..

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x test-verification.js
chmod +x ml/train/train_model.py

# Create a simple test model placeholder
echo "🧠 Creating test model placeholder..."
if [ ! -f "apps/inference/models/model.onnx" ]; then
    echo "⚠️  No ONNX model found. You'll need to train one first:"
    echo "   cd ml/train"
    echo "   python train_model.py"
    echo "   cp models/model.onnx ../../apps/inference/models/"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add your OpenAI API key to apps/web/.env"
echo "2. Train a model: cd ml/train && python train_model.py"
echo "3. Copy the trained model to apps/inference/models/"
echo "4. Start services:"
echo "   - Terminal 1: yarn workspace web dev"
echo "   - Terminal 2: yarn workspace inference dev"
echo "5. Test the system: node test-verification.js"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "🚀 Happy coding!"
