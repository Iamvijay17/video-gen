# TTS Service Documentation

## Overview

The TTS (Text-to-Speech) service is a Python-based microservice that provides audio generation capabilities using Google's Text-to-Speech API. Built with FastAPI, it offers RESTful endpoints for converting text to speech in multiple languages.

## Architecture

The service follows a microservice architecture pattern:

- **Framework**: FastAPI for high-performance async API
- **TTS Engine**: Google Text-to-Speech (gTTS) library
- **Audio Format**: MP3
- **Storage**: Local file system with configurable output directory
- **Containerization**: Docker for consistent deployment

## API Documentation

The TTS service provides interactive API documentation through Swagger UI and ReDoc:

- **Swagger UI**: `http://localhost:5050/docs` - Interactive API documentation with testing capabilities
- **ReDoc**: `http://localhost:5050/redoc` - Alternative API documentation view
- **OpenAPI JSON**: `http://localhost:5050/openapi.json` - OpenAPI specification

## API Endpoints

### Health Check

**GET** `/health`

Returns the service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "tts"
}
```

### Generate Speech

**POST** `/generate`

Generates speech from text input.

**Request Body:**
```json
{
  "text": "Hello, world!",
  "lang": "en"
}
```

**Parameters:**
- `text` (string, required): The text to convert to speech
- `lang` (string, optional): Language code (default: "en")

**Supported Languages:**
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `ko` - Korean
- `zh` - Chinese
- And many more (see gTTS documentation)

**Response:**
```json
{
  "success": true,
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "550e8400-e29b-41d4-a716-446655440000.mp3",
  "url": "/audio/550e8400-e29b-41d4-a716-446655440000.mp3"
}
```

### Retrieve Audio

**GET** `/audio/{filename}`

Retrieves a generated audio file.

**Parameters:**
- `filename` (string, required): The audio filename returned from generate endpoint

**Response:** Audio file (MP3 format) with appropriate headers

### Delete Audio

**DELETE** `/audio/{filename}`

Deletes a generated audio file from storage.

**Parameters:**
- `filename` (string, required): The audio filename to delete

**Response:**
```json
{
  "success": true,
  "message": "File deleted"
}
```

## Configuration

The service uses environment variables for configuration. Create a `.env` file in the tts-service directory:

```env
# TTS Service Configuration
PORT=5000
HOST=0.0.0.0

# Audio output settings
OUTPUT_DIR=audio
AUDIO_FORMAT=mp3

# TTS Engine settings
DEFAULT_LANGUAGE=en
DEFAULT_VOICE_SPEED=1.0

# CORS settings (for development)
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to run the service on | `5000` |
| `HOST` | Host to bind to | `0.0.0.0` |
| `OUTPUT_DIR` | Directory for audio file storage | `audio` |
| `AUDIO_FORMAT` | Audio format for generated files | `mp3` |
| `DEFAULT_LANGUAGE` | Default language for TTS | `en` |
| `DEFAULT_VOICE_SPEED` | Speech speed multiplier | `1.0` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://localhost:8000` |

## Dependencies

The service requires the following Python packages (defined in `requirements.txt`):

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
gTTS==2.5.1
pydub==0.25.1
python-multipart==0.0.6
python-dotenv==1.0.0
```

### System Dependencies

For Docker deployment, the following system packages are installed:
- `ffmpeg` - Audio processing
- `curl` - HTTP requests

## Setup and Installation

### Local Development

1. **Clone the repository and navigate to tts-service:**
   ```bash
   cd tts-service
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env  # Or create .env with your settings
   ```

5. **Run the service:**
   ```bash
   python src/api.py
   ```

   Or with uvicorn:
   ```bash
   uvicorn src.api:app --reload --host 127.0.0.1 --port 5000
   ```

### Docker Deployment

1. **Build the Docker image:**
   ```bash
   docker build -t tts-service .
   ```

2. **Run the container:**
   ```bash
   docker run -p 5000:5000 -v $(pwd)/storage:/app/output tts-service
   ```

### Docker Compose (with other services)

The service is included in the main `docker-compose.yml` file. To run with other services:

```bash
docker-compose up --build tts-service
```

## Usage Examples

### Python Client

```python
import requests

# Generate speech
response = requests.post('http://localhost:5000/generate', json={
    'text': 'Hello, world!',
    'lang': 'en'
})

if response.status_code == 200:
    data = response.json()
    audio_url = f"http://localhost:5000{data['url']}"

    # Download audio
    audio_response = requests.get(audio_url)
    with open('output.mp3', 'wb') as f:
        f.write(audio_response.content)
```

### cURL Examples

```bash
# Health check
curl http://localhost:5000/health

# Generate speech
curl -X POST http://localhost:5000/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "lang": "en"}'

# Get audio file (replace with actual filename)
curl -o output.mp3 http://localhost:5000/audio/550e8400-e29b-41d4-a716-446655440000.mp3

# Delete audio file
curl -X DELETE http://localhost:5000/audio/550e8400-e29b-41d4-a716-446655440000.mp3
```

### JavaScript/Fetch API

```javascript
// Generate speech
const response = await fetch('http://localhost:5000/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Hello, world!',
    lang: 'en'
  })
});

const data = await response.json();
console.log('Audio URL:', `http://localhost:5000${data.url}`);
```

## Error Handling

The service returns appropriate HTTP status codes and error messages:

- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Audio file not found
- `500 Internal Server Error` - TTS generation failed

Error responses include a `detail` field with error description:

```json
{
  "detail": "TTS generation failed: [error message]"
}
```

## File Management

- Audio files are stored in the configured `OUTPUT_DIR`
- Files are named with UUIDs for uniqueness
- Files should be cleaned up after use to prevent disk space issues
- The service provides a DELETE endpoint for file cleanup

## Performance Considerations

- TTS generation is synchronous and may take 1-3 seconds per request
- Consider implementing caching for frequently used phrases
- Audio files are served directly from disk for optimal performance
- The service is stateless and horizontally scalable

## Security

- CORS is configured for development origins
- Input validation using Pydantic models
- File access is restricted to the output directory
- No authentication implemented (add as needed for production)

## Monitoring

- Health endpoint available at `/health`
- Logs output to stdout/stderr
- Consider adding metrics collection for production deployment

## Troubleshooting

### Common Issues

1. **"TTS generation failed"**
   - Check internet connectivity (gTTS requires online access)
   - Verify text input is valid
   - Check language code is supported

2. **"Audio file not found"**
   - Verify filename from generate response
   - Check output directory permissions
   - Ensure file wasn't deleted or cleaned up

3. **CORS errors**
   - Add frontend origin to `CORS_ORIGINS` environment variable
   - Check request headers and preflight requests

### Logs

Enable debug logging by setting environment variable:
```env
LOG_LEVEL=DEBUG
```

## Contributing

When modifying the TTS service:

1. Update API documentation for any endpoint changes
2. Test with multiple languages and text inputs
3. Ensure Docker build works correctly
4. Update dependencies in `requirements.txt` if needed
5. Add tests for new functionality

## Future Enhancements

Potential improvements for the TTS service:

- **Caching**: Implement Redis for frequently used audio clips
- **Authentication**: Add API key or JWT authentication
- **Multiple TTS Engines**: Support for Azure, AWS Polly, etc.
- **Audio Processing**: Add effects, speed control, voice selection
- **Batch Processing**: Generate multiple audio files in one request
- **Streaming**: Real-time audio streaming instead of file generation
