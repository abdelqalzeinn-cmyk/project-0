from fastapi import FastAPI, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import cohere
import os
import logging
from dotenv import load_dotenv

# Create necessary directories
os.makedirs("templates", exist_ok=True)
os.makedirs("static", exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load environment variables
load_dotenv()

# Initialize Cohere client
try:
    cohere_api_key = os.getenv("COHERE_API_KEY")
    if not cohere_api_key:
        raise ValueError("COHERE_API_KEY environment variable not set")
        
    co = cohere.Client(cohere_api_key)
    logger.info("Cohere client initialized successfully")
    
except Exception as e:
    logger.error(f"Error initializing Cohere client: {str(e)}")
    co = None

@app.get("/")
async def read_root(request: Request):
    """Root endpoint serving the main HTML page"""
    try:
        return templates.TemplateResponse(
            "index.html", 
            {
                "request": request, 
                "model_loaded": co is not None
            }
        )
    except Exception as e:
        logger.error(f"Error serving root page: {str(e)}")
        raise HTTPException(status_code=500, detail="Error loading the application")

@app.get("/test")
async def test_endpoint():
    """Test endpoint to verify API is working"""
    return {
        "status": "Server is running",
        "model_loaded": co is not None
    }

@app.post("/api/chat")
async def chat_endpoint(data: dict):
    if not co:
        return {"response": "Cohere client not initialized. Please check the server logs."}
    
    try:
        prompt = data.get('prompt', '')
        if not prompt:
            return {"response": "No prompt provided"}
            
        # Call Cohere's generate endpoint with command-a-2025 model
        response = co.generate(
            model='command-a-2025',
            prompt=prompt,
            max_tokens=300,
            temperature=0.7,
            k=0,
            stop_sequences=[],
            return_likelihoods='NONE'
        )
        
        return {"response": response.generations[0].text}
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        return {"response": f"Error generating response: {str(e)}"}