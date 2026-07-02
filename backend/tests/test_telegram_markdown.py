from app.services.telegram_messages import (
    TELEGRAM_MARKDOWN_V2,
    build_admin_request_notification_message,
    build_course_announcement_caption,
    build_level_up_message,
)
from app.utils.telegram_markdown import escape_markdown, escape_markdown_v2
from bot.learning_messages import courses_reply, leaderboard_reply, start_reply
from bot.setup_messages import SETUP_REPLY_PARSE_MODE, group_setup_reply, private_setup_reply


def test_escape_markdown_helpers_escape_expected_characters():
    assert escape_markdown("A_*[x]`") == "A\\_\\*\\[x\\]\\`"
    assert escape_markdown_v2("A_*[x](url)!") == "A\\_\\*\\[x\\]\\(url\\)\\!"


def test_course_announcement_caption_escapes_user_content():
    caption = build_course_announcement_caption(
        "Python_[Pro]",
        "Description",
        "Launch (today)! Price: 10.00",
    )

    assert "Python\\_\\[Pro\\]" in caption
    assert "Launch \\(today\\)\\!" in caption
    assert "10\\.00" in caption
    assert TELEGRAM_MARKDOWN_V2 == "MarkdownV2"


def test_admin_request_notification_escapes_user_content():
    message = build_admin_request_notification_message(
        "owner_name",
        123,
        "School_[A]",
        "Budget is 10.00!",
    )

    assert "owner\\_name" in message
    assert "School\\_\\[A\\]" in message
    assert "10\\.00\\!" in message


def test_setup_replies_escape_dynamic_names():
    private_reply = private_setup_reply("School_*[A]", "Free", False, True)
    group_reply = group_setup_reply("School_*[A]", "Free", 12, True, "Owner_[X]", "bot_name")

    assert SETUP_REPLY_PARSE_MODE == "MarkdownV2"
    assert "School\\_\\*\\[A\\]" in private_reply
    assert "School\\_\\*\\[A\\]" in group_reply
    assert "Owner\\_\\[X\\]" in group_reply
    assert "bot\\_name" in group_reply


def test_level_up_message_uses_markdown_v2_builder():
    message = build_level_up_message(3)

    assert "*УРОВЕНЬ ВВЕРХ\\!*" in message
    assert "*Уровня 3*" in message


def test_learning_replies_escape_tenant_and_user_names():
    class User:
        username = "student_[1]"

    class Member:
        user = User()
        xp = 10
        level = 2

    assert "School\\_\\*\\[A\\]" in start_reply("School_*[A]")
    assert "School\\_\\*\\[A\\]" in courses_reply("School_*[A]")
    assert "student\\_\\[1\\]" in leaderboard_reply("School", [Member()])
