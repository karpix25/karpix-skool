import asyncio

from ..config import settings
from ..services.lesson_generation.course_structure_jobs import process_next_course_structure_generation_job
from ..services.lesson_generation.jobs import process_next_lesson_generation_job
from ..utils.logging_config import logger, setup_logging


async def run_worker() -> None:
    setup_logging()
    logger.info("Lesson generation worker started")
    while True:
        try:
            processed = await process_next_lesson_generation_job()
            if not processed:
                processed = await process_next_course_structure_generation_job()
        except Exception as exc:
            logger.exception("Lesson generation worker failed to process job: %s", exc)
            processed = False

        if not processed:
            await asyncio.sleep(settings.LESSON_GENERATION_POLL_SECONDS)


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
