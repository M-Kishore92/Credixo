# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from api import predict
from db.session import init_db

app = FastAPI(title="Credixo — Smart Loan AI Backend")

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", # Vite dev server
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Database Initialization on Startup
@app.on_event("startup")
def on_startup():
    init_db()

# 3. Health Check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# 4. Include Routers
app.include_router(predict.router, prefix="/api", tags=["prediction"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
