from dataclasses import dataclass, field
import uuid

from fastapi import BackgroundTasks
from sqlmodel.ext.asyncio.session import AsyncSession

from ...config import settings
from ...models import Lesson, User
from ...services.gamification import GamificationService
from ...services.webapp.lesson_access import get_lesson_access_state
from ...services.xp_ledger import XPLedgerService


QUIZ_QUESTION_XP_POINTS = 2
QUIZ_QUESTION_SOURCE_TYPE = "quiz_question"


@dataclass(frozen=True)
class QuizQuestionXpAward:
    xp_granted: int = 0
    newly_rewarded_question_ids: list[uuid.UUID] = field(default_factory=list)
    already_rewarded_question_ids: list[uuid.UUID] = field(default_factory=list)
    new_xp: int | None = None
    new_level: int | None = None


async def award_quiz_question_xp(
    *,
    session: AsyncSession,
    lesson: Lesson,
    correct_question_ids: list[uuid.UUID],
    background_tasks: BackgroundTasks,
    current_user: User,
) -> QuizQuestionXpAward:
    if not correct_question_ids:
        return QuizQuestionXpAward()

    access = await get_lesson_access_state(
        session=session,
        lesson=lesson,
        current_user=current_user,
        require_membership=True,
    )
    member = access.membership
    if not member:
        return QuizQuestionXpAward()

    xp_granted = 0
    newly_rewarded: list[uuid.UUID] = []
    already_rewarded: list[uuid.UUID] = []
    leveled_up = False
    new_xp = member.xp
    new_level = member.level

    for question_id in correct_question_ids:
        award = await XPLedgerService.award_xp(
            session=session,
            member=member,
            points=QUIZ_QUESTION_XP_POINTS,
            source_type=QUIZ_QUESTION_SOURCE_TYPE,
            source_id=question_id,
        )
        new_xp = award.new_xp
        new_level = award.new_level
        if award.granted:
            xp_granted += QUIZ_QUESTION_XP_POINTS
            newly_rewarded.append(question_id)
            leveled_up = leveled_up or award.leveled_up
        else:
            already_rewarded.append(question_id)

    if leveled_up and current_user.telegram_id:
        background_tasks.add_task(
            GamificationService.notify_level_up_direct,
            settings.BOT_TOKEN,
            current_user.telegram_id,
            new_level,
        )

    return QuizQuestionXpAward(
        xp_granted=xp_granted,
        newly_rewarded_question_ids=newly_rewarded,
        already_rewarded_question_ids=already_rewarded,
        new_xp=new_xp,
        new_level=new_level,
    )
