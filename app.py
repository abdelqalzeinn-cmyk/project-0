from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import os

# Create necessary directories
os.makedirs("templates", exist_ok=True)
os.makedirs("static", exist_ok=True)

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load model and tokenizer
print("Loading model and tokenizer...")
try:
    model = AutoModelForCausalLM.from_pretrained("./fine_tuned_model")
    tokenizer = AutoTokenizer.from_pretrained("./fine_tuned_model")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    print(f"Model loaded on {device}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    tokenizer = None

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "model_loaded": model is not None})

@app.post("/api/chat")
async def chat_endpoint(data: dict):
    if not model or not tokenizer:
        return {"response": "Model not loaded. Please check the server logs."}
    
    try:
        prompt = data.get('prompt', '')
        if not prompt:
            return {"response": "No prompt provided"}
            
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=200,  # Increased max length for chat responses
                num_return_sequences=1,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Remove the input prompt from the response
        response = response.replace(prompt, '').strip()
        return {"response": response}
    except Exception as e:
        return {"response": f"Error generating response: {str(e)}"}

@app.post("/generate")
async def generate_text(prompt: str = Form(...), max_length: int = Form(100)):
    if not model or not tokenizer:
        return {"error": "Model not loaded. Please check the server logs."}
    
    try:
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_length=max_length,
                num_return_sequences=1,
                temperature=0.7,
                top_p=0.9,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return {"generated_text": generated_text}
    except Exception as e:
        return {"error": f"Error generating text: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
