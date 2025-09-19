# TruChain 🔗

**AI Content Authenticity Verification System**

TruChain is a decentralized platform for verifying the authenticity of AI-generated content using GPT-powered analysis and blockchain technology. This project leverages OpenAI's GPT models for content verification and stores results on-chain with smart contracts.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS API                               │
│ - Unified API for all services                              │
│ - Direct GPT-4o integration                                 │
│ - TruChain token payments                                   │
│ - Blockchain verification storage                           │
└─────────────────────────────────────────────────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Inference     │    │ Smart Contracts │    │   Blockchain    │
│   Module        │    │ (Solidity)      │    │   Module        │
│   - GPT-4o API  │    │ - Verification  │    │   - Ethers.js   │
│   - Image Proc  │    │   Storage       │    │   - Contracts   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Verification  │    │   TruChain      │    │   Testing       │
│   Module        │    │   ERC20 Token   │    │   Framework     │
│   - Orchestrator│    │   - Payment     │    │   - Jest        │
│   - API         │    │   - Staking     │    │   - Supertest   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and Yarn
- OpenAI API key (for GPT-4o integration)
- Ethereum wallet and private key (for blockchain interaction)

### 1. Install Dependencies

```bash
# Install all workspace dependencies
yarn install

# Build the NestJS application
yarn build:nest
```

### 2. Set Up Environment Variables

```bash
# Create root .env file with required configuration
yarn setup:env

# Edit the .env file to include your OpenAI API key and blockchain settings
# OPENAI_API_KEY=your_key_here
# BLOCKCHAIN_RPC_URL=your_rpc_url
# PRIVATE_KEY=your_private_key
# TRUCHAIN_ADDRESS=your_contract_address
# IMAGE_VERIFICATION_ADDRESS=your_contract_address
```

### 3. Start the NestJS Service

```bash
# Development mode
yarn dev

# Production mode
yarn start

# Build the NestJS application
yarn build:nest
```

### 4. Test the System

```bash
# Run end-to-end tests
yarn test:e2e

# Test with base64 images
yarn test:base64

# Fix contract issues (if needed)
node fix-contract-issues.js
```

## 📁 Project Structure

```
verichain/
├── truchain-nest/         # NestJS unified application
│   ├── src/
│   │   ├── main.ts        # Application entry point
│   │   ├── app.module.ts  # Root module
│   │   ├── inference/     # GPT-4o inference module
│   │   ├── blockchain/    # Blockchain integration module
│   │   ├── verification/  # Verification orchestration module
│   │   └── shared/        # Shared utilities and config
│   ├── test/              # End-to-end and integration tests
│   └── package.json
├── blockchain/            # Hardhat workspace
│   ├── contracts/         # Solidity smart contracts
│   │   ├── ImageVerification.sol # Verification storage
│   │   └── TruChain.sol   # ERC20 token for payments
│   ├── scripts/           # Deployment scripts
│   └── test/              # Contract tests
├── fix-contract-issues.js # Utility for blockchain setup
├── run-nest-api.js        # Script to run NestJS app
├── test-base64.js         # Test script for base64 images
└── README.md
```

## 🔧 Service Details

### NestJS Application (`truchain-nest`)

- **Port**: 3000
- **Purpose**: Unified API for all services
- **Modules**:
  - **Inference**: GPT-4o integration for image analysis
  - **Blockchain**: Smart contract interaction via ethers.js
  - **Verification**: Orchestration of verification flow
  - **Shared**: Configuration and utilities

### Smart Contracts (`blockchain`)

- **Purpose**: On-chain storage of verification results
- **Contracts**:
  - **ImageVerification.sol**: Stores verification results on-chain
  - **TruChain.sol**: ERC20 token for verification payments
- **Features**:
  - Content hash verification
  - Token-based payment system
  - Burn and staking mechanisms
  - Verifier authorization

### Future GPT Training Integration

- **Purpose**: In-house fine-tuning of GPT models for improved verification
- **Features**:
  - Custom dataset creation
  - Fine-tuning for specific content types
  - Model performance evaluation
  - Continuous improvement pipeline

## 🧪 Testing

### Manual Testing

```bash
# Test image verification with base64
curl -X POST http://localhost:3000/api/verify/blockchain \
  -H "Content-Type: application/json" \
  -d '{"base64":"base64_encoded_image_data"}'

# Test detailed verification
curl -X POST http://localhost:3000/api/verify/blockchain/detailed \
  -H "Content-Type: application/json" \
  -d '{"base64":"base64_encoded_image_data"}'

# Test blockchain verification status
curl http://localhost:3000/api/blockchain/verify/0x1234...
```

### Automated Testing

```bash
# Run all end-to-end tests
yarn test:e2e

# Run specific test file
yarn test:e2e real-integration.e2e-spec.ts

# Test base64 image verification
yarn test:base64
```

## 📊 Monitoring & Observability

### Logging

The NestJS application uses structured logging:
- **Trace IDs**: Every request gets a unique trace ID
- **Structured logs**: JSON format with consistent fields
- **Service-specific logging**: Each module has its own logger

### Health Checks

```bash
# NestJS API health
curl http://localhost:3000/health

# Blockchain connection status
curl http://localhost:3000/api/blockchain/health
```

### Contract Verification

```bash
# Fix common contract issues (verifier, model approval, tokens)
node fix-contract-issues.js

# Check if an image is verified on-chain
curl http://localhost:3000/api/blockchain/isVerified/0x1234...
```

## 🔮 Future Roadmap

### Phase 2: Enhanced GPT Integration

- **GPT Fine-tuning**: Custom model training for specific content types
- **Multi-modal Analysis**: Combined text and image verification
- **Confidence Scoring**: Improved accuracy metrics
- **Explanation Generation**: Detailed reasoning for verification results

### Phase 3: Advanced Features

- **Video processing**: Support for video authenticity detection
- **Token Economics**: Enhanced staking and rewards system
- **Validator network**: Distributed verification consensus
- **Mobile SDK**: React Native and Flutter support

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 3000 is available
2. **OpenAI API errors**: Check API key and billing status
3. **Blockchain connection**: Verify RPC URL and private key
4. **Contract errors**: Run fix-contract-issues.js to resolve common problems

### Debug Mode

```bash
# Enable debug logging
DEBUG=* yarn dev

# Check environment variables
cat .env | grep -v PRIVATE_KEY
```

### Blockchain Troubleshooting

```bash
# Check contract addresses
node -e "require('dotenv').config(); console.log(process.env.TRUCHAIN_ADDRESS, process.env.IMAGE_VERIFICATION_ADDRESS)"

# Fix common contract issues
node fix-contract-issues.js
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

**Status**: NestJS integration complete with GPT-4o and blockchain verification.
**Next Milestone**: Enhanced GPT integration and token economics.