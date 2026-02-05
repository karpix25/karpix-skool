from fastapi import FastAPI
from contextlib import asynccontextmanager
from .db import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan, title="Telegram SaaS Platform")

import logging
from fastapi import Request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"START REQUEST: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"END REQUEST: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"REQUEST FAILED: {str(e)}")
        raise e

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SaaS Platform is running"}

from .routes import auth, tenants, courses, webapp, upload, super_admin

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(webapp.router, prefix="/webapp", tags=["WebApp"])
app.include_router(super_admin.router, prefix="/super", tags=["Super Admin"])
