# VeriChain NestJS API

A unified NestJS API for the VeriChain image verification platform. This API combines the functionality of the previous web, inference, and relayer services into a single, well-structured application.

## Features

- **Image Verification**: Analyze images using GPT-5 to determine if they are authentic or AI-generated
- **Blockchain Integration**: Store verification results on the blockchain using smart contracts
- **Token-Based Payments**: Use TruChain (TRU) tokens to pay for verification services
- **Detailed Explanations**: Get detailed explanations of why an image is considered real or fake

## Architecture

The application is organized into several modules:

- **Inference Module**: Handles image processing and GPT-5 API integration
- **Blockchain Module**: Manages interactions with Ethereum smart contracts
- **Verification Module**: Coordinates the verification process and exposes API endpoints
- **Shared Module**: Provides configuration and common utilities

## API Endpoints

- `GET /healthz` - Health check endpoint
- `GET /metrics` - Service metrics
- `POST /api/verify` - Basic image verification
- `POST /api/verify/detailed` - Detailed verification with explanation
- `POST /api/verify/blockchain` - Verify and store on blockchain
- `POST /api/verify/paid` - Paid verification using TRU tokens

## Getting Started

### Prerequisites

- Node.js 16+
- Yarn
- Ethereum network access (local or testnet)
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd apps/verichain-nest
   yarn install
   ```
3. Set up environment variables:
   ```
   yarn setup:env
   ```
4. Edit the `.env` file with your OpenAI API key and blockchain configuration
5. Build the application:
   ```
   yarn build
   ```

### Running the Application

```
yarn start
```

For development with auto-reload:
```
yarn start:dev
```

### Running Tests

```
yarn test
```

For end-to-end tests:
```
yarn test:e2e
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| OPENAI_API_KEY | OpenAI API key | - |
| GPT_MODEL | GPT model to use | gpt-5 |
| BLOCKCHAIN_RPC_URL | Ethereum RPC URL | http://localhost:8545 |
| PRIVATE_KEY | Private key for blockchain transactions | - |
| TRUCHAIN_ADDRESS | TruChain token contract address | - |
| IMAGE_VERIFICATION_ADDRESS | ImageVerification contract address | - |
| MIN_SCORE_THRESHOLD | Threshold for determining real/fake (in basis points) | 5000 |

## License

This project is licensed under the MIT License - see the LICENSE file for details.
