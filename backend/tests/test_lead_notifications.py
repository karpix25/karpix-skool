import pytest
from pydantic import ValidationError

from app.routes.leads import LeadApply
from app.services.lead_notifications import build_lead_notification_message


def test_build_lead_notification_message_escapes_markdown_values():
    lead = LeadApply(
        name="A_*[test]",
        telegram="@user(name)",
        schoolName="School #1",
        description="Price is 10.00!",
    )

    message = build_lead_notification_message(lead)

    assert "A\\_\\*\\[test\\]" in message
    assert "@user\\(name\\)" in message
    assert "School \\#1" in message
    assert "10\\.00\\!" in message


def test_lead_apply_enforces_max_lengths():
    with pytest.raises(ValidationError):
        LeadApply(
            name="a" * 121,
            telegram="@user",
            schoolName="School",
            description="Description",
        )
