# Video Generation Studio

A comprehensive video generation application with AI-powered text-to-speech, video rendering, and combined audio-video generation capabilities.

## Features

- 🎵 **Text-to-Speech Generation**: Convert text to high-quality audio in multiple languages
- 🎬 **Video Rendering**: Create custom videos with Remotion and GPU acceleration
- 🎯 **Combined Audio-Video Generation**: Generate both audio and video in a single workflow
- 📊 **Real-time Progress Tracking**: Monitor generation progress with detailed status updates
- 🗂️ **File Management**: Store and manage generated content with MinIO object storage
- 📱 **Modern UI**: Clean, responsive React interface with Tailwind CSS

## Project Structure

```
video-gen/
├── frontend/              # React/Vite frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/          # Utility functions
│   │   └── App.jsx       # Main application
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/               # Express.js backend API
│   ├── src/
│   │   ├── api/          # API routes (video, tts, storage)
│   │   ├── config/       # Database and MinIO configuration
│   │   ├── models/       # MongoDB models
│   │   └── remotion/     # Video rendering components
│   ├── index.js          # Main server file
│   ├── package.json
│   └── Dockerfile
├── tts-service/           # Python TTS service using FastAPI
│   ├── src/api.py         # TTS API with gTTS integration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── storage/               # Local file storage (audio/video files)
├── docs/                  # Documentation
├── docker-compose.yml     # Multi-service Docker orchestration
├── Dockerfile             # Frontend container build
├── nginx.conf             # Nginx configuration for frontend
└── README.md
```

## Quick Start (Local Development - No Docker)

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (local installation or cloud instance)
- **MinIO** (local installation or cloud instance)
- **FFmpeg** (for audio-video merging)

### 1. Install System Dependencies

#### Windows (PowerShell as Administrator):
```powershell
# Install FFmpeg
winget install ffmpeg

# Install MongoDB (if not using cloud instance)
# Download and install from: https://www.mongodb.com/try/download/community

# Install MinIO (if not using cloud instance)
# Download from: https://min.io/download
```

#### macOS:
```bash
# Install FFmpeg
brew install ffmpeg

# Install MongoDB
brew install mongodb-community

# Install MinIO
brew install minio/stable/minio
```

#### Linux (Ubuntu/Debian):
```bash
# Install FFmpeg
sudo apt update && sudo apt install ffmpeg

# Install MongoDB
sudo apt install mongodb

# Install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/
```

### 2. Start Required Services

#### Start MongoDB:
```bash
# Windows
mongod --dbpath "C:\data\db"

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

#### Start MinIO:
```bash
# Create data directory
mkdir ~/minio-data

# Start MinIO server
minio server ~/minio-data --console-address ":9001"

# MinIO will be available at:
# - API: http://localhost:9000
# - Console: http://localhost:9001
# - Default credentials: admin / password123
```

### 3. Setup and Run Services

#### Clone and setup the project:
```bash
git clone <repository-url>
cd video-gen
```

#### Start TTS Service:
```bash
cd tts-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Update .env file if needed (default should work for local development)
# PORT=5051
# HOST=127.0.0.1
# OUTPUT_DIR=../storage/audio

# Start TTS service
python src/api.py

# TTS service will be available at: http://localhost:5051
```

#### Start Backend API:
```bash
cd ../backend

# Install dependencies
npm install

# Create environment variables (or update existing ones)
# You can create a .env file or set environment variables directly

# Set environment variables for local development:
set MONGODB_URI=mongodb://localhost:27017/video_gen
set TTS_SERVICE_URL=http://localhost:5051
set MINIO_ENDPOINT=localhost:9000
set MINIO_ACCESS_KEY=admin
set MINIO_SECRET_KEY=password123
set MINIO_USE_SSL=false
set AUDIO_BUCKET=video-gen-audio
set VIDEO_BUCKET=video-gen-videos
set PORT=8000

# On Windows PowerShell:
$env:MONGODB_URI="mongodb://localhost:27017/video_gen"
$env:TTS_SERVICE_URL="http://localhost:5051"
$env:MINIO_ENDPOINT="localhost:9000"
$env:MINIO_ACCESS_KEY="admin"
$env:MINIO_SECRET_KEY="password123"
$env:MINIO_USE_SSL="false"
$env:AUDIO_BUCKET="video-gen-audio"
$env:VIDEO_BUCKET="video-gen-videos"
$env:PORT="8000"

# Start backend in development mode
npm run dev

# Backend API will be available at: http://localhost:8000
```

#### Start Frontend:
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Frontend will be available at: http://localhost:5173
```

### 4. Access the Application

Open your browser and navigate to: **http://localhost:5173**

## API Documentation

### Backend API (Port 8000)

#### Video Endpoints:
- `POST /api/video/render` - Render video only
- `POST /api/video/generate-with-audio` - Generate audio and video together
- `GET /api/video/jobs` - List video jobs
- `GET /api/video/jobs/:jobId` - Get specific job details

#### TTS Endpoints:
- `POST /api/tts/generate` - Generate text-to-speech audio
- `GET /api/tts/history` - Get TTS generation history

#### Storage Endpoints:
- `GET /api/storage/buckets` - List storage buckets
- `GET /api/storage/files/:bucket` - List files in bucket

### TTS Service API (Port 5051)

- `GET /health` - Health check
- `POST /generate` - Generate speech from text
- `GET /audio/{filename}` - Retrieve generated audio
- `DELETE /audio/{filename}` - Delete audio file

## Usage Examples

### Generate Audio-Video Content

1. Open the application at http://localhost:5173
2. Click on the "Audio-Video" tab
3. Enter your text in the textarea
4. Select language and customize video appearance
5. Click "Generate Audio-Video"
6. Monitor progress and view the final result

### API Usage Example

```bash
# Generate combined audio-video
curl -X POST http://localhost:8000/api/video/generate-with-audio \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test video with synchronized audio!",
    "lang": "en",
    "inputProps": {
      "titleText": "My Awesome Video",
      "titleColor": "#000000",
      "logoColor1": "#91EAE4",
      "logoColor2": "#86A8E7"
    }
  }'
```

## Configuration

### Environment Variables

#### Backend (.env):
```env
MONGODB_URI=mongodb://localhost:27017/video_gen
TTS_SERVICE_URL=http://localhost:5051
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_USE_SSL=false
AUDIO_BUCKET=video-gen-audio
VIDEO_BUCKET=video-gen-videos
PORT=8000
```

#### TTS Service (.env):
```env
PORT=5051
HOST=127.0.0.1
OUTPUT_DIR=../storage/audio
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
MINIO_USE_SSL=false
AUDIO_BUCKET=video-gen-audio
```

## Docker Deployment (Production)

For production deployment, Docker provides a complete containerized environment with all services properly orchestrated.

### Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **At least 8GB RAM** (recommended for video processing)
- **GPU support** (optional, for faster video rendering)

### Quick Start with Docker

#### Option 1: Automated Deployment (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd video-gen
   ```

2. **Run the automated deployment script**:
   ```bash
   # For secure production deployment with generated passwords
   ./deploy.sh

   # For quick testing with default passwords (not recommended for production)
   ./deploy.sh --quick

   # Show help
   ./deploy.sh --help
   ```

3. **Access the application**:
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **TTS Service**: http://localhost:5050
   - **MinIO Console**: http://localhost:9001
   - **MongoDB**: localhost:27017

#### Option 2: Manual Deployment

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd video-gen
   ```

2. **Start all services manually**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application** (same URLs as above)

### Detailed Docker Commands

#### Development with Docker
```bash
# Build and run in detached mode (background)
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️  This deletes all data)
docker-compose down -v

# Rebuild specific service
docker-compose up --build backend

# Scale services (if needed)
docker-compose up --scale api=3
```

#### Production Deployment

1. **Update environment variables** in `docker-compose.yml`:
   ```yaml
   environment:
     - MONGODB_URI=mongodb://admin:secure_password@db:27017/video_gen?authSource=admin
     - MINIO_ACCESS_KEY=your_secure_key
     - MINIO_SECRET_KEY=your_secure_secret
   ```

2. **Use external databases** (recommended for production):
   ```yaml
   # Replace the db service with external MongoDB
   # environment:
   #   - MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/video_gen
   ```

3. **Enable SSL/TLS**:
   ```yaml
   environment:
     - MINIO_USE_SSL=true
   ```

4. **Deploy with Docker Swarm** (for clustering):
   ```bash
   docker swarm init
   docker stack deploy -c docker-compose.yml video-gen
   ```

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Backend API   │────│   TTS Service   │
│   (React)       │    │   (Express.js)  │    │   (FastAPI)     │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 5050    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   MongoDB       │    │   MinIO         │
                    │   Port: 27017   │    │   Ports: 9000,  │
                    │                 │    │          9001   │
                    └─────────────────┘    └─────────────────┘
```

### Environment Configuration

#### Frontend Environment Variables
```yaml
environment:
  - NODE_ENV=production
  - VITE_API_URL=http://localhost:8000  # Change for production domain
```

#### Backend Environment Variables
```yaml
environment:
  - NODE_ENV=production
  - MONGODB_URI=mongodb://admin:password@db:27017/video_gen?authSource=admin
  - TTS_SERVICE_URL=http://tts:5000
  - MINIO_ENDPOINT=minio:9000
  - MINIO_ACCESS_KEY=admin
  - MINIO_SECRET_KEY=password123
  - AUDIO_BUCKET=video-gen-audio
  - VIDEO_BUCKET=video-gen-videos
```

#### TTS Service Environment Variables
```yaml
environment:
  - PYTHONUNBUFFERED=1
  - OUTPUT_DIR=/app/output/audio
  - MINIO_ENDPOINT=minio:9000
  - MINIO_ACCESS_KEY=admin
  - MINIO_SECRET_KEY=password123
  - AUDIO_BUCKET=video-gen-audio
```

### GPU Support (Optional)

For faster video rendering, enable GPU acceleration:

```yaml
services:
  api:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Volumes and Persistence

The Docker setup includes persistent volumes for:
- **MongoDB data**: `mongodb_data`
- **MinIO storage**: `minio_data`
- **Generated files**: `./storage` (mounted to TTS service)

### Health Checks and Monitoring

All services include health checks:
- **Frontend**: HTTP check on port 80
- **Backend**: Automatic (Express.js health endpoint)
- **TTS Service**: HTTP check on `/health` endpoint
- **MinIO**: HTTP check on `/minio/health/live`
- **MongoDB**: Built-in MongoDB health checks

### Troubleshooting Docker Deployment

#### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using ports
   netstat -tulpn | grep :3000
   # Change ports in docker-compose.yml
   ```

2. **Build failures**:
   ```bash
   # Clear Docker cache
   docker system prune -a
   # Rebuild without cache
   docker-compose build --no-cache
   ```

3. **Memory issues**:
   ```bash
   # Increase Docker memory limit
   # Docker Desktop: Settings > Resources > Memory
   ```

4. **GPU not detected**:
   ```bash
   # Install NVIDIA Docker support
   # https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
   ```

#### Logs and Debugging

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f frontend

# Enter container for debugging
docker-compose exec backend sh
```

### Production Considerations

#### Security
- Change default passwords in `docker-compose.yml`
- Use environment variables for sensitive data
- Enable SSL/TLS for all services
- Configure firewall rules
- Use secrets management (Docker secrets, AWS Secrets Manager, etc.)

#### Performance
- Use external managed databases (MongoDB Atlas, AWS DocumentDB)
- Configure load balancing for multiple instances
- Enable Redis for caching (if needed)
- Monitor resource usage and scale accordingly

#### Backup and Recovery
```bash
# Backup volumes
docker run --rm -v video-gen_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb_backup.tar.gz -C /data .
docker run --rm -v video-gen_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v video-gen_mongodb_data:/data -v $(pwd):/backup alpine tar xzf /backup/mongodb_backup.tar.gz -C /data
```

#### Monitoring
- Use Docker monitoring tools (Portainer, Docker Stats)
- Implement application monitoring (health checks, metrics)
- Set up log aggregation (ELK stack, Fluentd)
- Configure alerts for service failures

### Scaling and High Availability

For production environments with high traffic:

1. **Load Balancing**:
   ```yaml
   # Add nginx as reverse proxy
   services:
     nginx:
       image: nginx:alpine
       ports:
         - "80:80"
         - "443:443"
       volumes:
         - ./nginx.conf:/etc/nginx/nginx.conf
   ```

2. **Database Clustering**:
   ```yaml
   # Use MongoDB replica set
   services:
     db:
       image: mongo:7-jammy
       command: --replSet rs0 --bind_ip_all
   ```

3. **Service Scaling**:
   ```bash
   # Scale backend services
   docker-compose up --scale api=3 --scale tts=2
   ```

### Migration from Development to Production

1. **Update environment variables** for production URLs
2. **Configure domain names** and SSL certificates
3. **Set up CI/CD pipeline** for automated deployments
4. **Configure monitoring and alerting**
5. **Test backup and recovery procedures**
6. **Performance testing** under load

### Docker Compose File Reference

The `docker-compose.yml` includes:
- **5 services**: frontend, api, tts, db, minio
- **Network isolation**: `video-gen-network`
- **Persistent volumes**: `mongodb_data`, `minio_data`
- **Health checks**: For all services
- **GPU support**: Optional for video rendering
- **Resource limits**: Configurable memory/CPU limits

This Docker setup provides a production-ready deployment that can scale from development to enterprise-level usage.

## Technologies

- **Frontend**: React 19, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express.js, MongoDB, Remotion
- **TTS Service**: Python, FastAPI, gTTS, MinIO
- **Storage**: MinIO (S3-compatible object storage)
- **Video Processing**: FFmpeg, Remotion, Puppeteer
- **Database**: MongoDB

## Development

### Adding New Features

1. **Frontend**: Add new components in `frontend/src/components/`
2. **Backend**: Add new routes in `backend/src/api/`
3. **TTS Service**: Extend `tts-service/src/api.py`

### Testing

```bash
# Frontend tests
cd frontend && npm run lint

# Backend development
cd backend && npm run dev

# TTS service development
cd tts-service && python src/api.py
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Install FFmpeg system-wide
2. **MongoDB connection failed**: Ensure MongoDB is running on port 27017
3. **MinIO connection failed**: Check MinIO is running on port 9000
4. **Port conflicts**: Change ports in environment variables if needed
5. **CORS errors**: Update CORS_ORIGINS in TTS service .env file

### Logs

Check service logs for debugging:
- Frontend: Browser developer console
- Backend: Terminal where `npm run dev` is running
- TTS Service: Terminal where `python src/api.py` is running
- MongoDB: MongoDB log files
- MinIO: MinIO server logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally using the setup guide above
5. Submit a pull request

## License

This project is licensed under the MIT License.
