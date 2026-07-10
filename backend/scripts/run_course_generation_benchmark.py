#!/usr/bin/env python3
import argparse
import asyncio
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.services.lesson_generation.course_generation_benchmark import (
    BenchmarkRole,
    run_course_generation_benchmark,
)
from app.services.lesson_generation.course_generation_benchmark_io import (
    load_benchmark_configs,
    load_benchmark_fixtures,
)


async def _generate(role: BenchmarkRole, model: str, prompt: str) -> str:
    from app.services.lesson_generation.structure_text_generator import StructureTextGenerator

    generator = StructureTextGenerator(role=role, model_name=model)
    return await generator.generate_text(prompt)


async def _main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare planner, writer, and reviewer model configurations."
    )
    parser.add_argument("--fixtures", required=True, type=Path)
    parser.add_argument("--configs", required=True, type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    report = await run_course_generation_benchmark(
        configs=load_benchmark_configs(args.configs),
        fixtures=load_benchmark_fixtures(args.fixtures),
        executor=_generate,
    )
    rendered = report.to_json()
    if args.output:
        args.output.write_text(f"{rendered}\n", encoding="utf-8")
    else:
        print(rendered)


if __name__ == "__main__":
    asyncio.run(_main())
