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
