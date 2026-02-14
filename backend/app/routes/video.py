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

# Mux Configuration Helper
def get_mux_api():
    if not settings.MUX_TOKEN_ID or not settings.MUX_TOKEN_SECRET:
        logger.error("Mux credentials missing from configuration!")
        return None, None
    
    try:
        configuration = mux_python.Configuration()
        configuration.username = settings.MUX_TOKEN_ID
        configuration.password = settings.MUX_TOKEN_SECRET
        client = mux_python.ApiClient(configuration)
        return mux_python.DirectUploadsApi(client), mux_python.AssetsApi(client)
    except Exception as e:
        logger.error(f"Failed to initialize Mux API: {e}")
        return None, None

@router.get("/upload-url")
async def get_upload_url(lesson_id: str, session: AsyncSession = Depends(get_session), current_user=Depends(get_current_user)):
    direct_uploads_api, _ = get_mux_api()
    if not direct_uploads_api:
        raise HTTPException(status_code=500, detail="Mux is not configured or credentials invalid")
    
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
        upload_id = api_response.data.id
        
        # Save upload_id to the lesson for polling fallback
        try:
            import uuid
            lesson_uuid = uuid.UUID(lesson_id)
            stmt = select(Lesson).where(Lesson.id == lesson_uuid)
            result = await session.exec(stmt)
            lesson = result.first()
            if lesson:
                lesson.mux_upload_id = upload_id
                lesson.mux_status = "uploading"
                session.add(lesson)
                await session.commit()
                logger.info(f"Saved Mux upload_id {upload_id} for lesson {lesson_id}")
        except Exception as e:
            logger.error(f"Failed to save upload_id to lesson {lesson_id}: {e}")

        return {
            "upload_url": api_response.data.url,
            "upload_id": upload_id
        }
    except ApiException as e:
        logger.error(f"Exception when calling DirectUploadsApi->create_direct_upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to create upload URL")

@router.post("/webhook")
async def mux_webhook(request: Request, session: AsyncSession = Depends(get_session)):
    # In production, you should verify the webhook signature from Mux
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse Mux webhook JSON: {e}")
        return {"status": "error", "message": "invalid json"}

    event_type = payload.get("type")
    logger.info(f"Mux Webhook Received: {event_type}")
    
    # We care about asset readiness
    if event_type == "video.asset.ready":
        data = payload.get("data", {})
        asset_id = data.get("id")
        playback_ids = data.get("playback_ids", [])
        playback_id = playback_ids[0].get("id") if playback_ids else None
        lesson_id = data.get("passthrough")
        
        logger.info(f"Mux processing complete: asset={asset_id}, playback={playback_id}, passthrough={lesson_id}")
        
        if lesson_id:
            try:
                import uuid
                # Convert string ID to UUID for proper comparison
                lesson_uuid = uuid.UUID(lesson_id)
                stmt = select(Lesson).where(Lesson.id == lesson_uuid)
                result = await session.exec(stmt)
                lesson = result.first()
                if lesson:
                    lesson.mux_asset_id = asset_id
                    lesson.mux_playback_id = playback_id
                    lesson.mux_status = "ready"
                    session.add(lesson)
                    await session.commit()
                    logger.info(f"SUCCESS: Lesson {lesson_id} updated with Mux video {asset_id}")
                else:
                    logger.warning(f"Lesson {lesson_id} not found in database")
            except Exception as e:
                logger.error(f"Failed to update lesson {lesson_id} from webhook: {e}")
            
    return {"status": "ok"}
