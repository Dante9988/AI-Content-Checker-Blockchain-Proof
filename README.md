# VeriChain 🔗

**AI Content Authenticity Verification System**

VeriChain is a decentralized platform for verifying the authenticity of AI-generated content using machine learning models and blockchain technology. This project is currently in the pre-contract phase, focusing on the core ML infrastructure and services.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Service  │    │ Inference       │    │ ML Training     │
│   (Next.js)    │◄──►│ Service         │◄──►│ (Python + TF)   │
│   - OpenAI     │    │ - ONNX Runtime  │    │ - TensorFlow    │
│   - Chat API   │    │ - Image Proc    │    │ - Model Export  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SDK Package   │    │ Relayer Stub    │    │ Smart Contracts │
│   (TypeScript)  │    │ (Future:        │    │ (Future:        │
│   - Shared      │    │   Blockchain    │    │   Solidity)     │
│   - Types      │    │   Integration)   │    │   - FuelToken   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- Python 3.10+ (for ML training)
- Conda or virtual environment
- OpenAI API key (for chat functionality)

### 1. Install Dependencies

```bash
# Install all workspace dependencies
yarn install

# Build the SDK package
yarn workspace @verichain/sdk-js build
```

### 2. Set Up Environment Variables

```bash
# Create .env files for each service
echo "OPENAI_API_KEY=your_openai_key_here" > apps/web/.env
echo "MODEL_PATH=./models/model.onnx" > apps/inference/.env
```

### 3. Start Services

```bash
# Terminal 1: Web service (OpenAI + verification)
yarn workspace web dev

# Terminal 2: Inference service (ONNX model serving)
yarn workspace inference dev

# Terminal 3: Relayer stub (future blockchain integration)
yarn workspace relayer dev
```

### 4. Train ML Model

```bash
# Set up Python environment
cd ml/train
conda env create -f env.yml
conda activate verichain-ml

# Or use pip
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start Jupyter and run training
jupyter notebook notebooks/01_train.ipynb
```

> 📘 **For detailed ML pipeline documentation, see [ml/train/README.md](ml/train/README.md)**

### 5. Test the System

```bash
# Run end-to-end tests
node test-verification.js

# Or test individual services
curl http://localhost:3000/healthz
curl http://localhost:3001/healthz
```

## 📁 Project Structure

```
verichain/
├── apps/
│   ├── web/                 # Next.js web service
│   │   ├── server.js        # Express server with OpenAI
│   │   └── package.json
│   ├── inference/           # ONNX inference service
│   │   ├── server.js        # Express + ONNX runtime
│   │   ├── models/          # ONNX model storage
│   │   └── package.json
│   └── relayer/             # Future blockchain integration
│       ├── relayer.stub.js  # Stub implementation
│       └── package.json
├── packages/
│   ├── sdk-js/              # Shared TypeScript SDK
│   │   ├── src/
│   │   │   ├── types.ts     # Shared type definitions
│   │   │   ├── client.ts    # Client SDK
│   │   │   └── index.ts     # Main exports
│   │   └── package.json
│   └── contracts/           # Hardhat workspace (existing)
├── ml/
│   └── train/               # ML training pipeline
│       ├── env.yml          # Conda environment
│       ├── requirements.txt # Pip dependencies
│       └── notebooks/       # Jupyter notebooks
├── test-verification.js     # End-to-end test script
└── README.md
```

## 🔧 Service Details

### Web Service (`apps/web`)

- **Port**: 3000
- **Purpose**: OpenAI integration and verification orchestration
- **Endpoints**:
  - `POST /api/chat` - OpenAI chat completion (streaming)
  - `POST /api/verify` - Image verification (forwards to inference)
  - `GET /healthz` - Health check
  - `GET /metrics` - Service metrics

### Inference Service (`apps/inference`)

- **Port**: 3001
- **Purpose**: ONNX model serving for image classification
- **Endpoints**:
  - `POST /infer` - Image inference endpoint
  - `GET /healthz` - Health check
  - `GET /metrics` - Model and service metrics

### ML Training (`ml/train`)

- **Purpose**: Train and export ML models for authenticity detection
- **Pipeline**:
  1. Load and preprocess image dataset
  2. Train CNN classifier (real vs AI-generated)
  3. Export to ONNX format
  4. Generate model metadata and hash
- **Documentation**: 📘 [Detailed ML Pipeline README](ml/train/README.md) - Complete training, conversion, and inference documentation

### SDK Package (`packages/sdk-js`)

- **Purpose**: Shared types and client utilities
- **Features**:
  - TypeScript type definitions
  - Client SDK for service interaction
  - Content hash calculation utilities
  - Verification flow orchestration

## 🧪 Testing

### Manual Testing

```bash
# Test OpenAI chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test image verification
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg"}'

# Test inference directly
curl -X POST http://localhost:3001/infer \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg"}'
```

### Automated Testing

```bash
# Run end-to-end tests
node test-verification.js

# Test with custom URLs
node test-verification.js --web-url http://localhost:3000 --inference-url http://localhost:3001
```

## 📊 Monitoring & Observability

### Logging

All services use structured logging with Pino:
- **Trace IDs**: Every request gets a unique trace ID
- **Structured logs**: JSON format with consistent fields
- **Pretty printing**: Human-readable logs in development

### Health Checks

```bash
# Web service health
curl http://localhost:3000/healthz

# Inference service health
curl http://localhost:3001/healthz
```

### Metrics

```bash
# Service metrics
curl http://localhost:3000/metrics
curl http://localhost:3001/metrics
```

## 🔮 Future Roadmap

### Phase 2: Smart Contracts (Next Sprint)

- **FuelToken.sol**: ERC20 token for verification fees
- **ProofRegistry.sol**: On-chain proof storage
- **Validator contracts**: Staking and reward mechanisms

### Phase 3: Advanced Features

- **Video processing**: Support for video authenticity detection
- **Model marketplace**: Decentralized model distribution
- **Validator network**: Distributed verification consensus
- **Mobile SDK**: React Native and Flutter support

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000 and 3001 are available
2. **ONNX model missing**: Train and export model first, then copy to `apps/inference/models/`
3. **OpenAI API errors**: Check API key and billing status
4. **Python environment**: Ensure correct Python version and dependencies

### Debug Mode

```bash
# Enable debug logging
DEBUG=* yarn workspace web dev
DEBUG=* yarn workspace inference dev
```

### Service Dependencies

```bash
# Check service health
yarn workspace web health
yarn workspace inference health

# View logs
yarn workspace web logs
yarn workspace inference logs
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: This README and inline code comments

---

**Status**: Pre-contract phase - Core ML infrastructure complete, smart contracts next sprint.
**Next Milestone**: Smart contract development and on-chain integration.
