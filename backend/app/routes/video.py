from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
import mux_python
from mux_python.rest import ApiException
from ..db import get_session
from ..models import Lesson
from ..routes.auth import get_current_user
from ..config import settings
from ..utils.logging_config import logger

router = APIRouter()

# Mux Configuration
if settings.MUX_TOKEN_ID and settings.MUX_TOKEN_SECRET:
    configuration = mux_python.Configuration()
    configuration.username = settings.MUX_TOKEN_ID
    configuration.password = settings.MUX_TOKEN_SECRET
    direct_uploads_api = mux_python.DirectUploadsApi(mux_python.ApiClient(configuration))
    assets_api = mux_python.AssetsApi(mux_python.ApiClient(configuration))
else:
    logger.warning("Mux credentials not configured")
    direct_uploads_api = None
    assets_api = None

@router.get("/upload-url")
async def get_upload_url(lesson_id: str, current_user=Depends(get_current_user)):
    if not direct_uploads_api:
        raise HTTPException(status_code=500, detail="Mux is not configured")
    
    try:
        # Create a direct upload with metadata to link back to the lesson
        create_asset_request = mux_python.CreateAssetRequest(
            playback_policy=[mux_python.PlaybackPolicy.PUBLIC],
            test=settings.ENVIRONMENT != "production",
            passthrough=lesson_id # Pass lesson_id back via webhooks
        )
        create_upload_request = mux_python.CreateUploadRequest(
            new_asset_settings=create_asset_request,
            cors_origin="*" # For dev; ideally specific in production
        )
        
        api_response = direct_uploads_api.create_direct_upload(create_upload_request)
        return {
            "upload_url": api_response.data.url,
            "upload_id": api_response.data.id
        }
    except ApiException as e:
        logger.error(f"Exception when calling DirectUploadsApi->create_direct_upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to create upload URL")

@router.post("/webhook")
async def mux_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    # In production, you should verify the webhook signature from Mux
    payload = await request.json()
    event_type = payload.get("type")
    
    logger.info(f"Mux Webhook received: {event_type}")
    
    if event_type == "video.asset.ready":
        asset_id = payload["data"]["id"]
        playback_id = payload["data"]["playback_ids"][0]["id"]
        lesson_id = payload["data"].get("passthrough")
        
        if lesson_id:
            try:
                stmt = select(Lesson).where(Lesson.id == lesson_id)
                result = await session.exec(stmt)
                lesson = result.first()
                if lesson:
                    lesson.mux_asset_id = asset_id
                    lesson.mux_playback_id = playback_id
                    lesson.mux_status = "ready"
                    session.add(lesson)
                    await session.commit()
                    logger.info(f"Lesson {lesson_id} updated with Mux video {asset_id}")
            except Exception as e:
                logger.error(f"Failed to update lesson {lesson_id} from webhook: {e}")
            
    return {"status": "ok"}
