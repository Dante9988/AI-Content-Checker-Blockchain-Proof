#!/bin/bash

# Setup Environment Variables for VeriChain

# Colors for console output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up environment files for VeriChain...${NC}"

# Create root .env file
echo -e "${YELLOW}Creating root .env file...${NC}"
cat > .env << EOL
# VeriChain Environment Variables

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
GPT_MODEL=gpt-5

# Service URLs
INFERENCE_URL=http://localhost:3001
WEB_URL=http://localhost:3000

# Blockchain Configuration
VERIFIER_ADDRESS=0x0000000000000000000000000000000000000000

# Server Configuration
WEB_PORT=3000
INFERENCE_PORT=3001
EOL

# Create apps/web/.env file
echo -e "${YELLOW}Creating web service .env file...${NC}"
mkdir -p apps/web
cat > apps/web/.env << EOL
# Web Service Environment Variables

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Service URLs
INFERENCE_URL=http://localhost:3001

# Server Configuration
PORT=3000
VERIFIER_ADDRESS=0x0000000000000000000000000000000000000000
EOL

# Create apps/inference/.env file
echo -e "${YELLOW}Creating inference service .env file...${NC}"
mkdir -p apps/inference
cat > apps/inference/.env << EOL
# Inference Service Environment Variables

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
GPT_MODEL=gpt-5

# Server Configuration
PORT=3001
EOL

echo -e "${GREEN}Environment files created successfully!${NC}"
echo -e "${YELLOW}IMPORTANT: Edit the .env files to add your OpenAI API key before starting the services.${NC}"
echo -e "${BLUE}To start the services, run: yarn dev${NC}"
