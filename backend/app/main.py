from fastapi import FastAPI, Request
from contextlib import asynccontextmanager
from .db import init_db

from .utils.logging_config import setup_logging, logger
from .config import settings
from .services.cors_origins import build_cors_allow_origins

if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        environment=settings.ENVIRONMENT
    )
    logger.info("Sentry initialized")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup (Migrations are now handled by entrypoint.sh)
    setup_logging()
    await init_db()
    yield
    # Shutdown

app = FastAPI(lifespan=lifespan, title="Telegram SaaS Platform")

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
app.add_middleware(RateLimitMiddleware, limit=300, window=60) # 300 rpm for 10K students scaling

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=build_cors_allow_origins(settings),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "SaaS Platform is running"}

from .routes import (
    agent,
    ai,
    analytics,
    auth,
    courses,
    health,
    payments,
    super_admin,
    super_generation_settings,
    super_leads,
    tenants,
    upload,
    video,
    webapp,
    webapp_course_subscriptions,
    webapp_courses,
    webapp_deep_links,
    webapp_lesson_attachments,
    webapp_lessons,
    webapp_levels,
    webapp_quizzes,
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(agent.router, prefix="/agent", tags=["Agent"])
app.include_router(health.router, tags=["System"])
app.include_router(tenants.router, prefix="/tenants", tags=["Tenants"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(ai.router, prefix="/ai", tags=["AI"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(webapp.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_courses.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_course_subscriptions.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_deep_links.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_lessons.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_lesson_attachments.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_quizzes.router, prefix="/webapp", tags=["WebApp"])
app.include_router(webapp_levels.router, prefix="/webapp", tags=["WebApp"])
app.include_router(super_admin.router, prefix="/super", tags=["Super Admin"])
app.include_router(super_generation_settings.router, prefix="/super", tags=["Super Admin"])
app.include_router(super_leads.router, prefix="/super", tags=["Super Admin"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(video.router, prefix="/video", tags=["Video"])

from .routes import debug, leads
app.include_router(debug.router, prefix="/debug", tags=["Debug"])
app.include_router(leads.router, prefix="/leads", tags=["Leads"])
