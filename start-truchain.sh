#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== TruChain Development Environment ===${NC}"
echo -e "${GREEN}Starting PostgreSQL, pgAdmin, and TruChain API...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${YELLOW}Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Stop any existing containers to avoid port conflicts
echo -e "${GREEN}Stopping any existing TruChain containers...${NC}"
docker-compose down > /dev/null 2>&1

# Start the services
echo -e "${GREEN}Starting services with Docker Compose...${NC}"
docker-compose up -d

# Wait for the database to be ready
echo -e "${GREEN}Waiting for PostgreSQL to be ready...${NC}"
until docker exec truchain-postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
  sleep 2
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Show service information
echo -e "${BLUE}=== Services Information ===${NC}"
echo -e "${GREEN}TruChain API:${NC} http://localhost:3000"
echo -e "${GREEN}Swagger Docs:${NC} http://localhost:3000/api/docs"
echo -e "${GREEN}pgAdmin:${NC} http://localhost:5050"
echo -e "${YELLOW}pgAdmin Login:${NC} admin@truchain.com / admin"
echo -e "${YELLOW}PostgreSQL Connection:${NC} Host: postgres, Port: 5432, User: postgres, Password: postgres, DB: truchain"

# Follow the logs
echo -e "${BLUE}=== Application Logs ===${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop following logs (services will continue running)${NC}"
docker-compose logs -f truchain-api
