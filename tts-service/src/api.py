from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gtts import gTTS
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="TTS Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create output directory if it doesn't exist
OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "output"))
OUTPUT_DIR.mkdir(exist_ok=True)

class TTSRequest(BaseModel):
    text: str
    lang: str = "en"

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tts"}

@app.post("/generate")
async def generate_speech(request: TTSRequest):
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.mp3"
        filepath = OUTPUT_DIR / filename

        # Generate speech
        tts = gTTS(text=request.text, lang=request.lang, slow=False)
        tts.save(str(filepath))

        return {
            "success": True,
            "file_id": file_id,
            "filename": filename,
            "url": f"/audio/{filename}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

@app.get("/audio/{filename}")
async def get_audio(filename: str):
    filepath = OUTPUT_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    return FileResponse(
        path=filepath,
        media_type="audio/mpeg",
        filename=filename
    )

@app.delete("/audio/{filename}")
async def delete_audio(filename: str):
    filepath = OUTPUT_DIR / filename
    if filepath.exists():
        filepath.unlink()

    return {"success": True, "message": "File deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
