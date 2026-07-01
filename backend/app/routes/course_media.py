from sqlmodel.ext.asyncio.session import AsyncSession

from ..models import Lesson, VideoProvider


async def sync_mux_lesson_status(lesson: Lesson, session: AsyncSession) -> Lesson:
    if lesson.mux_status == "ready" or not (lesson.mux_upload_id or lesson.video_provider == VideoProvider.mux):
        return lesson

    from .video import get_mux_api
    from ..utils.logging_config import logger

    direct_uploads_api, assets_api = get_mux_api()
    if not direct_uploads_api or not assets_api:
        return lesson

    try:
        found_asset = None

        if lesson.mux_upload_id:
            try:
                upload_res = direct_uploads_api.get_direct_upload(lesson.mux_upload_id)
                if upload_res.data.status == "completed" and upload_res.data.asset_id:
                    asset_res = assets_api.get_asset(upload_res.data.asset_id)
                    found_asset = asset_res.data
                elif upload_res.data.status == "errored":
                    lesson.mux_status = "errored"
            except Exception as upload_err:
                logger.debug("Direct upload check failed for %s: %s", lesson.id, upload_err)

        if not found_asset:
            list_assets_res = assets_api.list_assets(limit=10)
            for asset in list_assets_res.data:
                if asset.passthrough == str(lesson.id):
                    found_asset = asset
                    break

        if not found_asset:
            return lesson

        if found_asset.status == "ready":
            playback_id = found_asset.playback_ids[0].id if found_asset.playback_ids else None
            lesson.mux_asset_id = found_asset.id
            lesson.mux_playback_id = playback_id
            lesson.mux_status = "ready"
            lesson.video_provider = VideoProvider.mux
            session.add(lesson)
            await session.commit()
            await session.refresh(lesson)
            logger.info("POLLING SUCCESS: Lesson %s synced with Mux asset %s", lesson.id, found_asset.id)
        elif lesson.mux_status != found_asset.status:
            lesson.mux_status = found_asset.status
            session.add(lesson)
            await session.commit()
            await session.refresh(lesson)
    except Exception as exc:
        logger.error("Error during Mux polling fallback for lesson %s: %s", lesson.id, exc)

    return lesson
