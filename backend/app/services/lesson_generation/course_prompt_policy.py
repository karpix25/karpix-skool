COURSE_PROGRESSION_POLICY = """
Course progression:
- Build the course from simple to complex.
- Start with the basic mental model, vocabulary, and first simple action.
- Then combine actions into workflows and student artifacts.
- Move to edge cases, mistakes, optimization, and independent application only after prerequisites are clear.
- Do not introduce an advanced idea before the learner has the needed previous concept or artifact.
""".strip()


PRACTICAL_PLAIN_LANGUAGE_POLICY = """
Writing style:
- Russian language, simple enough for a Russian 10th grade student.
- Use short direct sentences and everyday words.
- Avoid academic wording, motivational filler, generic summaries, and abstract advice.
- Every paragraph must explain one concrete idea, show an example, or give an action.
- Prefer practical instructions, checklists, scripts, tables, diagnostics, and exercises.
""".strip()


NO_WATER_POLICY = """
No-water rule:
- Do not write motivational introductions.
- Do not repeat the same idea in different words.
- Avoid vague phrases like "важно понимать", "в современном мире", "это играет ключевую роль",
  unless the same sentence gives a concrete action or example.
- Each lesson must produce a student artifact: checklist, script, table, plan, worksheet, diagnostic, map, or decision.
""".strip()


LESSON_QUIZ_POLICY = """
Lesson quiz:
- Every generated lesson must include a short quiz in the returned JSON.
- Use 3-5 questions.
- Make questions check understanding and practical application, not memorizing wording.
- Use simple Russian suitable for a Russian 10th grade student.
- Use only facts and actions supported by the lesson source pack.
- Include at least one practical application question.
- Every question must include a short explanation of the correct answer.
- Use single_choice, multiple_choice, or short_text only.
- For single_choice, include 3-4 options and exactly one correct option.
- For multiple_choice, include 3-5 options and at least one correct option.
- For short_text, include accepted correct answers as correct options.
""".strip()


def course_quality_policy_block() -> str:
    return "\n\n".join(
        [
            COURSE_PROGRESSION_POLICY,
            PRACTICAL_PLAIN_LANGUAGE_POLICY,
            NO_WATER_POLICY,
        ]
    )


def lesson_quiz_policy_block() -> str:
    return LESSON_QUIZ_POLICY
