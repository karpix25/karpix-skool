import json

import pytest

from app.services.lesson_generation.course_generation_benchmark_io import (
    load_benchmark_configs,
    load_benchmark_fixtures,
)


def test_benchmark_io_loads_fixed_fixtures_and_configs(tmp_path):
    fixture_path = tmp_path / "fixtures.json"
    fixture_path.write_text(
        json.dumps(
            [
                {
                    "fixture_id": "one",
                    "stages": [
                        {
                            "role": "planner",
                            "prompt": "plan",
                            "required_json_keys": ["modules"],
                        }
                    ],
                }
            ]
        ),
        encoding="utf-8",
    )
    config_path = tmp_path / "configs.json"
    config_path.write_text(
        json.dumps(
            [
                {
                    "name": "one",
                    "planner_model": "p",
                    "writer_model": "w",
                    "reviewer_model": "r",
                }
            ]
        ),
        encoding="utf-8",
    )

    fixtures = load_benchmark_fixtures(fixture_path)
    configs = load_benchmark_configs(config_path)

    assert fixtures[0].stages[0].required_json_keys == ("modules",)
    assert configs[0].model_for("reviewer") == "r"


def test_benchmark_io_rejects_unknown_role(tmp_path):
    path = tmp_path / "fixtures.json"
    path.write_text(
        '[{"fixture_id":"bad","stages":[{"role":"admin","prompt":"x"}]}]',
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="Unsupported benchmark role"):
        load_benchmark_fixtures(path)
