from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from minio import Minio
from minio.error import S3Error

# Load environment variables
load_dotenv()

app = FastAPI(
    title="TTS Service",
    version="1.0.0",
    description="A Text-to-Speech service built with FastAPI that converts text to audio using Google TTS.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create output directory if it doesn't exist
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "audio"))
OUTPUT_DIR.mkdir(exist_ok=True)

# MinIO configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "admin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "password123")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
AUDIO_BUCKET = os.getenv("AUDIO_BUCKET", "video-gen-audio")

# Initialize MinIO client
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_USE_SSL
)

def initialize_minio_bucket():
    """Initialize MinIO bucket if it doesn't exist"""
    try:
        if not minio_client.bucket_exists(AUDIO_BUCKET):
            minio_client.make_bucket(AUDIO_BUCKET)
            print(f"Created bucket: {AUDIO_BUCKET}")

        # Set public read policy
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": "*"},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{AUDIO_BUCKET}/*"]
                }
            ]
        }
        minio_client.set_bucket_policy(AUDIO_BUCKET, str(policy).replace("'", '"'))
        print(f"Set public policy for bucket: {AUDIO_BUCKET}")
    except S3Error as e:
        print(f"MinIO error: {e}")

# Initialize bucket on startup
initialize_minio_bucket()

class TTSRequest(BaseModel):
    text: str
    lang: str = "en"

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "tts"}

@app.post("/generate", tags=["TTS"])
async def generate_speech(request: TTSRequest):
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.mp3"
        filepath = OUTPUT_DIR / filename
        minio_path = f"audio/{filename}"

        # Generate speech
        tts = gTTS(text=request.text, lang=request.lang, slow=False)
        tts.save(str(filepath))

        # Upload to MinIO
        try:
            minio_client.fput_object(
                AUDIO_BUCKET,
                minio_path,
                str(filepath)
            )
            print(f"Audio uploaded to MinIO: {minio_path}")

            # Clean up local file
            filepath.unlink()
            print("Local audio file cleaned up")

            # Return MinIO URL
            minio_url = f"http://localhost:9000/{AUDIO_BUCKET}/{minio_path}"
            return {
                "success": True,
                "file_id": file_id,
                "filename": filename,
                "url": minio_url
            }

        except S3Error as upload_error:
            print(f"MinIO upload failed: {upload_error}")
            # Return local URL as fallback
            return {
                "success": True,
                "file_id": file_id,
                "filename": filename,
                "url": f"/audio/{filename}"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

@app.get("/audio/{filename}", tags=["Audio"])
async def get_audio(filename: str):
    filepath = OUTPUT_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=filepath,
        media_type="audio/mpeg",
        filename=filename
    )

@app.delete("/audio/{filename}", tags=["Audio"])
async def delete_audio(filename: str):
    filepath = OUTPUT_DIR / filename
    if filepath.exists():
        filepath.unlink()

    return {"success": True, "message": "File deleted"}

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    print(f"Starting TTS service on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
