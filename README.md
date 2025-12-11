# Video Gen

A video generation application with React frontend and scalable backend architecture.

## Project Structure

```
video-gen/
├── frontend/          # React/Vite frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/           # Express.js backend API
│   ├── index.js       # Main server file with health route
│   ├── package.json
│   └── Dockerfile
├── tts-service/       # Python TTS service using FastAPI
│   ├── src/api.py     # TTS API with gTTS integration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── docker-compose.yml # Multi-service Docker orchestration
├── Dockerfile         # Frontend container build
├── nginx.conf         # Nginx configuration for frontend
└── .dockerignore      # Docker build exclusions
```

## Docker Setup

### Current Setup (Frontend Only)

The current Docker configuration provides a production-ready containerized frontend:

- **Multi-stage build** for optimized image size
- **Nginx** for static file serving
- **SPA routing support** for React Router
- **Caching headers** for static assets
- **Health checks** and auto-restart

### Running the Frontend

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs
```

Frontend will be available at: http://localhost:3000

### TTS Service

The TTS (Text-to-Speech) service provides audio generation capabilities:

**Endpoints:**
- `GET /health` - Health check
- `POST /generate` - Generate speech from text
- `GET /audio/{filename}` - Retrieve generated audio
- `DELETE /audio/{filename}` - Delete audio file

**Example usage:**
```bash
# Generate speech
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "lang": "en"}'

# Get audio file
curl http://localhost:5000/audio/{file_id}.mp3
```

### Environment Variables

Frontend environment variables (available at build time):
- `VITE_API_URL`: Backend API endpoint

### Development vs Production

- **Development**: Use `npm run dev` in frontend directory
- **Production**: Use Docker containers for deployment

### Extending the Setup

To add backend services:

1. Create `backend/` directory
2. Add backend Dockerfile
3. Uncomment and configure services in `docker-compose.yml`
4. Update network configuration
5. Add environment variables and volumes as needed

## Technologies

- **Frontend**: React 19, Vite, ESLint
- **Backend**: Node.js, Express
- **Container**: Docker, Docker Compose
- **Web Server**: Nginx
