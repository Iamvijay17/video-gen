#!/bin/bash

# Video Generation Studio - Docker Deployment Script
# This script helps deploy the application using Docker for production

set -e

echo "🚀 Video Generation Studio - Docker Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Check system requirements
check_system() {
    print_status "Checking system requirements..."

    # Check available memory
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        MEM_GB=$(free -g | awk 'NR==2{printf "%.0f", $2}')
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        MEM_GB=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc)
    else
        MEM_GB=8  # Default assumption for Windows
    fi

    if [ "$MEM_GB" -lt 4 ]; then
        print_warning "System has ${MEM_GB}GB RAM. At least 4GB recommended for video processing."
    else
        print_success "System has ${MEM_GB}GB RAM"
    fi

    # Check available disk space
    DISK_GB=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
    if [ "$DISK_GB" -lt 10 ]; then
        print_warning "Low disk space: ${DISK_GB}GB available. At least 10GB recommended."
    else
        print_success "Sufficient disk space available"
    fi
}

# Create necessary directories
setup_directories() {
    print_status "Setting up directories..."

    mkdir -p storage/audio
    mkdir -p storage/videos
    mkdir -p logs

    print_success "Directories created"
}

# Generate secure passwords
generate_passwords() {
    print_status "Generating secure passwords..."

    # Generate random passwords
    MONGO_PASSWORD=$(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
    MINIO_ACCESS_KEY=$(openssl rand -hex 8)
    MINIO_SECRET_KEY=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-20)

    print_success "Passwords generated"
}

# Update docker-compose.yml with secure passwords
update_compose_file() {
    print_status "Updating docker-compose.yml with secure credentials..."

    # Backup original file
    cp docker-compose.yml docker-compose.yml.backup

    # Update MongoDB password
    sed -i.bak "s/MONGO_INITDB_ROOT_PASSWORD=password/MONGO_INITDB_ROOT_PASSWORD=$MONGO_PASSWORD/g" docker-compose.yml
    sed -i.bak "s/mongodb:\/\/admin:password@mongo/mongodb:\/\/admin:$MONGO_PASSWORD@mongo/g" docker-compose.yml

    # Update MinIO credentials
    sed -i.bak "s/MINIO_ROOT_PASSWORD=password123/MINIO_ROOT_PASSWORD=$MINIO_SECRET_KEY/g" docker-compose.yml
    sed -i.bak "s/MINIO_ACCESS_KEY=admin/MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY/g" docker-compose.yml
    sed -i.bak "s/MINIO_SECRET_KEY=password123/MINIO_SECRET_KEY=$MINIO_SECRET_KEY/g" docker-compose.yml

    print_success "Docker Compose file updated"
}

# Create .env files for services
create_env_files() {
    print_status "Creating environment files..."

    # Backend .env
    cat > backend/.env << EOF
# Backend Configuration for Docker Production
NODE_ENV=production
PORT=8000
MONGODB_URI=mongodb://admin:$MONGO_PASSWORD@db:27017/video_gen?authSource=admin
TTS_SERVICE_URL=http://tts:5050
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_USE_SSL=false
AUDIO_BUCKET=video-gen-audio
VIDEO_BUCKET=video-gen-videos
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
EOF

    # TTS Service .env
    cat > tts-service/.env << EOF
# TTS Service Configuration for Docker Production
PORT=5050
HOST=0.0.0.0
OUTPUT_DIR=/app/output/audio
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=$MINIO_ACCESS_KEY
MINIO_SECRET_KEY=$MINIO_SECRET_KEY
MINIO_USE_SSL=false
AUDIO_BUCKET=video-gen-audio
CORS_ORIGINS=http://localhost:3000,http://frontend:80
EOF

    print_success "Environment files created"
}

# Save credentials to a secure file
save_credentials() {
    print_status "Saving credentials to credentials.txt..."

    cat > credentials.txt << EOF
# Video Generation Studio - Production Credentials
# Generated on: $(date)
# ⚠️  IMPORTANT: Keep this file secure and delete after deployment!

MongoDB:
- Username: admin
- Password: $MONGO_PASSWORD
- Connection: mongodb://admin:$MONGO_PASSWORD@db:27017/video_gen

MinIO:
- Access Key: $MINIO_ACCESS_KEY
- Secret Key: $MINIO_SECRET_KEY
- Console URL: http://localhost:9001
- API URL: http://localhost:9000

Application URLs:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- TTS Service: http://localhost:5050

# To change these passwords later:
# 1. Update docker-compose.yml
# 2. Run: docker-compose down && docker-compose up --build
EOF

    chmod 600 credentials.txt
    print_success "Credentials saved to credentials.txt (keep this file secure!)"
}

# Deploy the application
deploy_application() {
    print_status "Starting deployment..."

    # Stop any existing containers
    docker-compose down 2>/dev/null || true

    # Build and start services
    docker-compose up --build -d

    print_success "Deployment started!"
    print_status "Waiting for services to be healthy..."

    # Wait for services to be ready
    sleep 30

    # Check service health
    check_services_health

    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Application URLs:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  MinIO Console: http://localhost:9001"
    echo ""
    print_warning "⚠️  Save the credentials.txt file securely and delete it after confirming everything works!"
}

# Check if services are healthy
check_services_health() {
    print_status "Checking service health..."

    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi

    # Wait a bit more for services to initialize
    sleep 10

    # Test basic connectivity
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is accessible"
    else
        print_warning "Frontend may not be ready yet"
    fi

    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend API is healthy"
    else
        print_warning "Backend API may not be ready yet"
    fi

    if curl -f http://localhost:5050/health > /dev/null 2>&1; then
        print_success "TTS Service is healthy"
    else
        print_warning "TTS Service may not be ready yet"
    fi
}

# Main deployment function
main() {
    echo "This script will deploy Video Generation Studio using Docker."
    echo "It will generate secure passwords and configure all services."
    echo ""

    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi

    check_docker
    check_system
    setup_directories
    generate_passwords
    update_compose_file
    create_env_files
    save_credentials
    deploy_application

    echo ""
    echo "Next steps:"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Check MinIO console at http://localhost:9001 (use credentials from credentials.txt)"
    echo "3. Monitor logs with: docker-compose logs -f"
    echo "4. Stop services with: docker-compose down"
    echo ""
    print_warning "Remember to delete credentials.txt after confirming everything works!"
}

# Show usage if --help is passed
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Video Generation Studio - Docker Deployment Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo "  --quick       Quick deployment with default passwords (not recommended for production)"
    echo ""
    echo "This script will:"
    echo "  - Check system requirements"
    echo "  - Generate secure passwords"
    echo "  - Configure docker-compose.yml"
    echo "  - Create environment files"
    echo "  - Deploy all services"
    echo "  - Verify service health"
    echo ""
    exit 0
fi

# Quick deployment option
if [ "$1" = "--quick" ]; then
    print_warning "Using quick deployment with default passwords (not secure for production!)"
    MONGO_PASSWORD="password"
    MINIO_ACCESS_KEY="admin"
    MINIO_SECRET_KEY="password123"
    update_compose_file
    create_env_files
    deploy_application
    exit 0
fi

# Run main deployment
main
