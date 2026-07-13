import uuid

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.models import Course, Lesson, LessonProgress, Module, Tenant, TenantMember, User
from app.models_quizzes import LessonQuiz, QuizAttempt, QuizOption, QuizQuestion, QuizQuestionType
from app.routes import course_quizzes, webapp_quizzes
from app.schemas.quizzes import LessonQuizUpsert, QuizAnswerSubmission, QuizAttemptCreate
from app.services.quizzes.quiz_scoring import (
    ScoringOption,
    ScoringQuestion,
    SubmittedAnswer,
    normalize_short_text_answer,
    score_quiz,
)
from app.services.quizzes.quiz_xp import QuizQuestionXpAward
from app.services.webapp import lesson_completion
from app.services.webapp.lesson_completion import complete_webapp_lesson


class FakeResult:
    def __init__(self, *, first_value=None, all_value=None):
        self._first_value = first_value
        self._all_value = all_value if all_value is not None else []

    def first(self):
        return self._first_value

    def all(self):
        return self._all_value


class FakeTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeSession:
    def __init__(self, objects=None, exec_results=None):
        self._objects = {(type(item), item.id): item for item in objects or []}
        self._exec_results = list(exec_results or [])
        self.added = []
        self.deleted = []
        self.committed = False
        self.flushed = False
        self.refreshed = []

    async def get(self, model, item_id):
        return self._objects.get((model, item_id))

    async def exec(self, _statement):
        if not self._exec_results:
            raise AssertionError("Unexpected database query")
        return self._exec_results.pop(0)

    def add(self, item):
        self.added.append(item)
        if hasattr(item, "id"):
            self._objects[(type(item), item.id)] = item

    async def delete(self, item):
        self.deleted.append(item)

    def begin_nested(self):
        return FakeTransaction()

    async def flush(self):
        self.flushed = True

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


def test_scoring_supports_choice_exactness_and_safe_short_text_contract():
    single_correct = uuid.uuid4()
    multi_a = uuid.uuid4()
    multi_b = uuid.uuid4()
    text_correct = uuid.uuid4()
    questions = [
        ScoringQuestion(
            id=uuid.uuid4(),
            question_type=QuizQuestionType.single_choice,
            options=[
                ScoringOption(id=single_correct, text="Right", is_correct=True),
                ScoringOption(id=uuid.uuid4(), text="Wrong", is_correct=False),
            ],
        ),
        ScoringQuestion(
            id=uuid.uuid4(),
            question_type=QuizQuestionType.multiple_choice,
            options=[
                ScoringOption(id=multi_a, text="A", is_correct=True),
                ScoringOption(id=multi_b, text="B", is_correct=True),
            ],
        ),
        ScoringQuestion(
            id=uuid.uuid4(),
            question_type=QuizQuestionType.short_text,
            options=[ScoringOption(id=text_correct, text="  Karpix   Skool ", is_correct=True)],
        ),
    ]

    score = score_quiz(
        questions=questions,
        answers=[
            SubmittedAnswer(question_id=questions[0].id, selected_option_ids=[single_correct]),
            SubmittedAnswer(question_id=questions[1].id, selected_option_ids=[multi_b, multi_a]),
            SubmittedAnswer(question_id=questions[2].id, text_answer="karpix skool"),
        ],
    )

    assert score.score_percent == 100
    assert [result.is_correct for result in score.question_results] == [True, True, True]
    assert normalize_short_text_answer("  Karpix \n Skool  ") == "karpix skool"


@pytest.mark.asyncio
async def test_admin_quiz_payload_roundtrip_hides_nothing_and_replaces_questions(monkeypatch):
    _tenant, _user, _member, course, module, lesson = lesson_context()
    quiz, questions, options_by_question = quiz_context(lesson.id)
    existing_question = QuizQuestion(
        id=uuid.uuid4(),
        quiz_id=quiz.id,
        text="Old",
        question_type=QuizQuestionType.single_choice,
    )
    existing_option = QuizOption(
        id=uuid.uuid4(),
        question_id=existing_question.id,
        text="Old option",
        is_correct=True,
    )
    session = FakeSession(
        [course, module, lesson, quiz, existing_question, existing_option],
        [
            FakeResult(first_value=quiz),
            FakeResult(all_value=[existing_question]),
            FakeResult(all_value=[existing_option]),
            FakeResult(first_value=quiz),
            FakeResult(all_value=questions),
            FakeResult(all_value=options_by_question[questions[0].id]),
            FakeResult(all_value=options_by_question[questions[1].id]),
            FakeResult(all_value=options_by_question[questions[2].id]),
        ],
    )

    async def fake_invalidate_course_write_caches(**_kwargs):
        return None

    monkeypatch.setattr(course_quizzes, "invalidate_course_write_caches", fake_invalidate_course_write_caches)

    response = await course_quizzes.upsert_lesson_quiz(
        LessonQuizUpsert(
            is_enabled=True,
            is_required=True,
            passing_score_percent=67,
            allow_retries=True,
            questions=[
                {
                    "text": question.text,
                    "question_type": question.question_type,
                    "order_index": question.order_index,
                    "options": [
                        {
                            "text": option.text,
                            "is_correct": option.is_correct,
                            "order_index": option.order_index,
                        }
                        for option in options_by_question[question.id]
                    ],
                }
                for question in questions
            ],
        ),
        lesson,
        session,
    )

    assert session.committed is True
    assert existing_question in session.deleted
    assert existing_option in session.deleted
    assert response.questions[0].options[0].is_correct is True


@pytest.mark.asyncio
async def test_student_attempt_scores_and_completes_passed_quiz(monkeypatch):
    _tenant, user, _member, course, module, lesson = lesson_context()
    quiz, questions, options_by_question = quiz_context(lesson.id)
    session = FakeSession([lesson])

    async def fake_get_available_quiz(**_kwargs):
        return lesson, quiz

    async def fake_get_questions(**_kwargs):
        return questions

    async def fake_get_options(**kwargs):
        return options_by_question[kwargs["question_id"]]

    async def fake_get_latest_attempt(**_kwargs):
        return None

    async def fake_complete_webapp_lesson(**_kwargs):
        return {"message": "Lesson completed!", "xp_granted": 10}

    async def fake_award_quiz_question_xp(**kwargs):
        return QuizQuestionXpAward(
            xp_granted=6,
            newly_rewarded_question_ids=kwargs["correct_question_ids"],
            new_xp=6,
            new_level=1,
        )

    monkeypatch.setattr(webapp_quizzes, "_get_available_quiz", fake_get_available_quiz)
    monkeypatch.setattr(webapp_quizzes, "_get_questions", fake_get_questions)
    monkeypatch.setattr(webapp_quizzes, "_get_options", fake_get_options)
    monkeypatch.setattr("app.services.quizzes.quiz_attempts.get_latest_attempt", fake_get_latest_attempt)
    monkeypatch.setattr("app.services.quizzes.quiz_attempts.complete_webapp_lesson", fake_complete_webapp_lesson)
    monkeypatch.setattr("app.services.quizzes.quiz_attempts.award_quiz_question_xp", fake_award_quiz_question_xp)

    response = await webapp_quizzes.submit_student_lesson_quiz_attempt(
        lesson.id,
        QuizAttemptCreate(
            answers=[
                QuizAnswerSubmission(
                    question_id=questions[0].id,
                    selected_option_ids=[options_by_question[questions[0].id][0].id],
                ),
                QuizAnswerSubmission(
                    question_id=questions[1].id,
                    selected_option_ids=[
                        options_by_question[questions[1].id][1].id,
                        options_by_question[questions[1].id][0].id,
                    ],
                ),
                QuizAnswerSubmission(question_id=questions[2].id, text_answer="karpix skool"),
            ]
        ),
        BackgroundTasks(),
        session,
        user,
    )

    assert response.passed is True
    assert response.score_percent == 100
    assert response.attempt_id
    assert response.correct_count == 3
    assert response.total_questions == 3
    assert response.question_results[0].explanation is None
    assert response.xp_granted == 6
    assert response.new_xp == 6
    assert response.new_level == 1
    assert response.newly_rewarded_question_ids == [question.id for question in questions]
    assert response.completion_result == {"message": "Lesson completed!", "xp_granted": 10}
    assert any(isinstance(item, QuizAttempt) for item in session.added)


@pytest.mark.asyncio
async def test_student_quiz_read_hides_short_text_answers_and_correct_flags():
    _tenant, _user, _member, _course, _module, lesson = lesson_context()
    quiz, questions, options_by_question = quiz_context(lesson.id)
    session = FakeSession(
        exec_results=[
            FakeResult(all_value=questions),
            FakeResult(all_value=options_by_question[questions[0].id]),
            FakeResult(all_value=options_by_question[questions[1].id]),
        ],
    )

    response = await webapp_quizzes._build_student_quiz_read(session=session, quiz=quiz)

    assert response.questions[0].options[0].model_dump() == {
        "id": options_by_question[questions[0].id][0].id,
        "text": "A",
        "order_index": 0,
    }
    assert response.questions[2].question_type == QuizQuestionType.short_text
    assert response.questions[2].options == []


def test_student_answer_validation_rejects_cross_question_options():
    _tenant, _user, _member, _course, _module, lesson = lesson_context()
    _quiz, questions, options_by_question = quiz_context(lesson.id)

    with pytest.raises(HTTPException) as exc_info:
        webapp_quizzes._validate_answers_belong_to_quiz(
            questions=questions,
            options_by_question=options_by_question,
            answers=[
                QuizAnswerSubmission(
                    question_id=questions[0].id,
                    selected_option_ids=[options_by_question[questions[1].id][0].id],
                )
            ],
        )

    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_required_quiz_blocks_manual_completion_before_progress_or_xp(monkeypatch):
    tenant, user, member, course, module, lesson = lesson_context()
    quiz = LessonQuiz(lesson_id=lesson.id, is_enabled=True, is_required=True)
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
            FakeResult(first_value=quiz),
            FakeResult(first_value=None),
        ],
    )

    async def fake_invalidate_lesson_completion_caches(**_kwargs):
        raise AssertionError("Blocked quiz completion must not invalidate caches")

    monkeypatch.setattr(
        lesson_completion,
        "invalidate_lesson_completion_caches",
        fake_invalidate_lesson_completion_caches,
    )

    with pytest.raises(HTTPException) as exc_info:
        await complete_webapp_lesson(
            lesson_id=lesson.id,
            background_tasks=BackgroundTasks(),
            current_user=user,
            session=session,
        )

    assert exc_info.value.status_code == 403
    assert session.added == []
    assert session.committed is False


@pytest.mark.asyncio
async def test_passed_quiz_attempt_uses_completion_idempotency(monkeypatch):
    tenant, user, member, course, module, lesson = lesson_context()
    progress = LessonProgress(user_id=user.id, lesson_id=lesson.id)
    session = FakeSession(
        [tenant, course, module, lesson],
        [
            FakeResult(first_value=None),
            FakeResult(first_value=member),
            FakeResult(first_value=progress),
            FakeResult(all_value=[(module.id, 1, 1)]),
        ],
    )

    response = await complete_webapp_lesson(
        lesson_id=lesson.id,
        background_tasks=BackgroundTasks(),
        current_user=user,
        session=session,
        skip_required_quiz_check=True,
    )

    assert response["message"] == "Already completed"
    assert response["xp_granted"] == 0
    assert session.added == []
    assert session.committed is False
