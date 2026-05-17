# backend/main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import uvicorn
import os
from api import predict
from db.session import init_db

app = FastAPI(title="Credixo — Smart Loan AI Backend")

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Custom Exception Handler for Validation Errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    print(f"[VALIDATION ERROR] {errors}")
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation failed",
            "errors": [
                {
                    "field": ".".join(str(x) for x in error["loc"][1:]),
                    "message": error["msg"],
                    "type": error["type"],
                }
                for error in errors
            ],
        },
    )

# 3. Database Initialization on Startup (skipped when SKIP_DB_PERSISTENCE=true)
@app.on_event("startup")
def on_startup():
    if os.getenv("SKIP_DB_PERSISTENCE", "false").lower() != "true":
        init_db()

# 4. Health Check
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# 5. Include Routers
app.include_router(predict.router, prefix="/api", tags=["prediction"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
