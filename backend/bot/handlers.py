from aiogram import Router

from .handlers_activity import router as activity_router
from .handlers_admin import router as admin_router
from .handlers_learning import router as learning_router
from .handlers_setup import router as setup_router
from .handlers_start import router as start_router

router = Router()
router.include_router(start_router)
router.include_router(setup_router)
router.include_router(admin_router)
router.include_router(learning_router)
router.include_router(activity_router)
