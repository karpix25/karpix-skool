from ...schemas.webapp_levels import WebAppXpSource


def build_xp_sources() -> list[WebAppXpSource]:
    return [
        WebAppXpSource(
            source_type="lesson",
            title="Завершение урока",
            description="Начисляется один раз за первый проход урока.",
            points=10,
        ),
        WebAppXpSource(
            source_type="quiz_question",
            title="Правильный ответ в тесте",
            description="Начисляется один раз за каждый вопрос, когда вы впервые ответили на него правильно.",
            points=2,
        ),
        WebAppXpSource(
            source_type="message",
            title="Сообщение в группе школы",
            description="Считается только в привязанной Telegram-группе.",
            points=1,
            limit="до 20 XP в час",
        ),
        WebAppXpSource(
            source_type="reaction",
            title="Реакция на ваше сообщение",
            description="Начисляется автору сообщения, когда на него реагируют.",
            points=2,
        ),
    ]
