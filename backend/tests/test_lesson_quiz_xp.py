import uuid

import pytest
from fastapi import BackgroundTasks

from app.models import Course, Lesson, Module, Tenant, TenantMember, User
from app.models_quizzes import LessonQuiz, QuizAttempt, QuizOption, QuizQuestion, QuizQuestionType
from app.schemas.quizzes import QuizAnswerSubmission
from app.services.quizzes import quiz_attempts
from app.services.quizzes.quiz_xp import QuizQuestionXpAward


class FakeSession:
    def __init__(self, objects=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self.added = []
        self.committed = False
        self.refreshed = []

    def add(self, item):
        self.added.append(item)
        if hasattr(item, "id"):
            self._objects[(type(item), item.id)] = item

    async def commit(self):
        self.committed = True

    async def refresh(self, item):
        self.refreshed.append(item)


def lesson_context():
    tenant = Tenant(id=uuid.uuid4(), name="School")
    user = User(id=uuid.uuid4(), telegram_id=123, username="student")
    member = TenantMember(id=uuid.uuid4(), tenant_id=tenant.id, user_id=user.id, level=1, xp=0)
    course = Course(id=uuid.uuid4(), tenant_id=tenant.id, title="Course", is_published=True)
    module = Module(id=uuid.uuid4(), course_id=course.id, title="Module")
    lesson = Lesson(id=uuid.uuid4(), module_id=module.id, title="Lesson", is_published=True)
    return tenant, user, member, course, module, lesson


def quiz_context(lesson_id: uuid.UUID):
    quiz = LessonQuiz(
        id=uuid.uuid4(),
        lesson_id=lesson_id,
        is_enabled=True,
        is_required=True,
        passing_score_percent=67,
        allow_retries=True,
    )
    single = QuizQuestion(
        id=uuid.uuid4(),
        quiz_id=quiz.id,
        text="Pick one",
        question_type=QuizQuestionType.single_choice,
        order_index=0,
    )
    multiple = QuizQuestion(
        id=uuid.uuid4(),
        quiz_id=quiz.id,
        text="Pick many",
        question_type=QuizQuestionType.multiple_choice,
        order_index=1,
    )
    text = QuizQuestion(
        id=uuid.uuid4(),
        quiz_id=quiz.id,
        text="Type it",
        question_type=QuizQuestionType.short_text,
        order_index=2,
    )
    options = {
        single.id: [
            QuizOption(id=uuid.uuid4(), question_id=single.id, text="A", is_correct=True, order_index=0),
            QuizOption(id=uuid.uuid4(), question_id=single.id, text="B", is_correct=False, order_index=1),
        ],
        multiple.id: [
            QuizOption(id=uuid.uuid4(), question_id=multiple.id, text="X", is_correct=True, order_index=0),
            QuizOption(id=uuid.uuid4(), question_id=multiple.id, text="Y", is_correct=True, order_index=1),
        ],
        text.id: [
            QuizOption(id=uuid.uuid4(), question_id=text.id, text="Karpix Skool", is_correct=True, order_index=0),
        ],
    }
    return quiz, [single, multiple, text], options


@pytest.mark.asyncio
async def test_quiz_attempt_xp_awards_correct_answers_without_requiring_pass(monkeypatch):
    _tenant, user, _member, _course, _module, lesson = lesson_context()
    quiz, questions, options_by_question = quiz_context(lesson.id)
    awarded_question_ids = []

    async def fake_get_latest_attempt(**_kwargs):
        return QuizAttempt(quiz_id=quiz.id, lesson_id=lesson.id, user_id=user.id)

    async def fake_complete_webapp_lesson(**_kwargs):
        return {"message": "Already completed", "xp_granted": 0}

    async def fake_award_quiz_question_xp(**kwargs):
        awarded_question_ids.extend(kwargs["correct_question_ids"])
        return QuizQuestionXpAward(
            xp_granted=2 * len(kwargs["correct_question_ids"]),
            newly_rewarded_question_ids=kwargs["correct_question_ids"],
        )

    monkeypatch.setattr(quiz_attempts, "get_latest_attempt", fake_get_latest_attempt)
    monkeypatch.setattr(quiz_attempts, "complete_webapp_lesson", fake_complete_webapp_lesson)
    monkeypatch.setattr(quiz_attempts, "award_quiz_question_xp", fake_award_quiz_question_xp)

    passed = await quiz_attempts.submit_quiz_attempt(
        session=FakeSession([lesson]),
        lesson=lesson,
        quiz=quiz,
        questions=questions,
        options_by_question=options_by_question,
        answers=[
            QuizAnswerSubmission(
                question_id=questions[0].id,
                selected_option_ids=[options_by_question[questions[0].id][0].id],
            ),
            QuizAnswerSubmission(
                question_id=questions[1].id,
                selected_option_ids=[
                    options_by_question[questions[1].id][0].id,
                    options_by_question[questions[1].id][1].id,
                ],
            ),
            QuizAnswerSubmission(question_id=questions[2].id, text_answer="karpix skool"),
        ],
        background_tasks=BackgroundTasks(),
        current_user=user,
    )

    assert passed.passed is True
    assert awarded_question_ids == [question.id for question in questions]
    assert passed.xp_granted == 6

    quiz.passing_score_percent = 100
    awarded_question_ids.clear()
    failed = await quiz_attempts.submit_quiz_attempt(
        session=FakeSession([lesson]),
        lesson=lesson,
        quiz=quiz,
        questions=questions,
        options_by_question=options_by_question,
        answers=[
            QuizAnswerSubmission(
                question_id=questions[0].id,
                selected_option_ids=[options_by_question[questions[0].id][0].id],
            )
        ],
        background_tasks=BackgroundTasks(),
        current_user=user,
    )

    assert failed.passed is False
    assert failed.score_percent == 33
    assert failed.xp_granted == 2
    assert awarded_question_ids == [questions[0].id]
    assert failed.completion_result is None
