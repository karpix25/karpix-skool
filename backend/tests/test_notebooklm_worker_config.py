from pathlib import Path
import re


def test_lesson_generation_worker_receives_super_admin_id():
    compose = Path("docker-compose.yml").read_text()
    worker_block = _compose_service_block(compose, "lesson_generation_worker")

    assert "- SUPER_ADMIN_ID=${SUPER_ADMIN_ID:-}" in worker_block


def _compose_service_block(compose: str, service_name: str) -> str:
    marker = f"\n  {service_name}:\n"
    start = compose.find(marker)
    assert start != -1, f"{service_name} service is missing"

    next_service = re.search(r"\n  [a-zA-Z0-9_-]+:\n", compose[start + len(marker) :])
    if not next_service:
        return compose[start:]
    return compose[start : start + len(marker) + next_service.start()]
