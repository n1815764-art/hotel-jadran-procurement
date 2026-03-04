#!/bin/bash

# n8n Setup Script for Hotel Purchasing Automation
# Usage: ./scripts/setup-n8n.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker/n8n"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  n8n Setup for Hotel Automation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! docker-compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not available${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Navigate to docker directory
cd "$DOCKER_DIR"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠ .env file not found${NC}"
    echo "Creating .env from template..."
    
    # Generate secure passwords
    ENCRYPTION_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 64 /dev/urandom | xxd -p | tr -d '\n')
    POSTGRES_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -d '=+/')
    ADMIN_PASSWORD=$(openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64 | tr -d '=+/')
    
    # Copy template and replace values
    cp .env.example .env
    
    # Update values in .env
    sed -i.bak "s/N8N_ENCRYPTION_KEY=your_encryption_key_here/N8N_ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    sed -i.bak "s/POSTGRES_PASSWORD=your_secure_password_here/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
    sed -i.bak "s/N8N_BASIC_AUTH_PASSWORD=your_admin_password_here/N8N_BASIC_AUTH_PASSWORD=$ADMIN_PASSWORD/" .env
    rm -f .env.bak
    
    echo -e "${GREEN}✓ Created .env with secure passwords${NC}"
    echo ""
    echo -e "${YELLOW}Generated credentials:${NC}"
    echo "  Admin Username: admin"
    echo "  Admin Password: $ADMIN_PASSWORD"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Save these credentials!${NC}"
    echo "   They are stored in: $DOCKER_DIR/.env"
    echo ""
    read -p "Press Enter to continue..."
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Create backup directory
mkdir -p backup

# Pull latest images
echo ""
echo -e "${BLUE}Pulling Docker images...${NC}"
docker compose pull

# Start services
echo ""
echo -e "${BLUE}Starting n8n and PostgreSQL...${NC}"
docker compose up -d

# Wait for services to be healthy
echo ""
echo -e "${BLUE}Waiting for services to start...${NC}"
RETRIES=30
while [ $RETRIES -gt 0 ]; do
    if docker compose ps | grep -q "healthy"; then
        echo -e "${GREEN}✓ Services are healthy${NC}"
        break
    fi
    echo -n "."
    sleep 2
    RETRIES=$((RETRIES - 1))
done

if [ $RETRIES -eq 0 ]; then
    echo ""
    echo -e "${RED}✗ Services failed to start${NC}"
    echo "Check logs with: docker compose logs"
    exit 1
fi

# Get credentials
ADMIN_USER=$(grep N8N_BASIC_AUTH_USER .env | cut -d '=' -f2)
ADMIN_PASS=$(grep N8N_BASIC_AUTH_PASSWORD .env | cut -d '=' -f2)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  n8n is running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Access n8n:${NC}"
echo "  URL: http://localhost:5678"
echo "  Username: $ADMIN_USER"
echo "  Password: $ADMIN_PASS"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  View logs:    docker compose logs -f"
echo "  Stop:         docker compose down"
echo "  Restart:      docker compose restart"
echo "  Backup:       docker compose exec n8n n8n export:workflow --all"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Open http://localhost:5678 in your browser"
echo "  2. Create your first workflow"
echo "  3. Import workflows from ./n8n-workflows/"
echo ""
