from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from .db import init_db

from .utils.logging_config import setup_logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    await init_db()
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan, title="Telegram SaaS Platform")

from .utils.logging_config import setup_logging, logger

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"START {request.method} {request.url.path}")
    try:
        response = await call_next(request)
        logger.info(f"END REQUEST: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"REQUEST FAILED: {str(e)}")
        raise e

from .utils.rate_limiter import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware, limit=60, window=60) # 60 rpm default

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

from .routes import auth, tenants, courses, webapp, upload, super_admin, analytics, health, ai, payments

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(health.router, tags=["System"])
app.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(webapp.router, prefix="/webapp", tags=["WebApp"])
app.include_router(super_admin.router, prefix="/super", tags=["Super Admin"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
