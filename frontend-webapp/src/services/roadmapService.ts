import api from '../api/client';

export interface SchoolData {
    name: string;
    teachingGoal: string;
}

export interface RoadmapStep {
    title: string;
    description: string;
    tasks: string[];
}

export interface AIResponse {
    curriculum: RoadmapStep[];
    successMessage: string;
}

interface BackendAIResponse {
    text?: string;
}

const fallbackRoadmap = (data: SchoolData): AIResponse => ({
    successMessage: `${data.name} принята в работу. Мы подготовим запуск школы и вернемся со следующим шагом.`,
    curriculum: [
        {
            title: 'Собрать основу школы',
            description: 'Зафиксируйте обещание курса, аудиторию и первый измеримый результат ученика.',
            tasks: [
                'Описать портрет ученика',
                'Сформулировать главный результат обучения',
                'Выбрать формат первых материалов',
            ],
        },
        {
            title: 'Разложить программу',
            description: `Разбейте тему "${data.teachingGoal}" на короткие модули с понятным прогрессом.`,
            tasks: [
                'Составить 3-5 модулей',
                'Определить первый бесплатный урок',
                'Отметить VIP или закрытые материалы',
            ],
        },
        {
            title: 'Подготовить запуск',
            description: 'Настройте доступы, обложки, описания и Telegram-группу до приглашения учеников.',
            tasks: [
                'Проверить видимость курса',
                'Настроить правила открытия уроков',
                'Подготовить приветственное сообщение',
            ],
        },
        {
            title: 'Проверить обучение',
            description: 'Пройдите путь ученика и убедитесь, что XP, прогресс и доступы работают ожидаемо.',
            tasks: [
                'Открыть курс как студент',
                'Завершить тестовый урок',
                'Проверить рейтинг и профиль',
            ],
        },
    ],
});

const parseRoadmapJson = (text: string): AIResponse => {
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr) as AIResponse;
};

export async function generateSchoolRoadmap(data: SchoolData): Promise<AIResponse> {
    const prompt = `Generate a launch roadmap for a Telegram mini-app school.
School name: ${data.name}
Teaching goal: ${data.teachingGoal}

Return valid JSON only:
{
  "successMessage": "short motivational message in Russian",
  "curriculum": [
    {
      "title": "step title in Russian",
      "description": "step description in Russian",
      "tasks": ["task 1", "task 2", "task 3"]
    }
  ]
}

Use exactly 4 curriculum steps.`;

    try {
        const result = await api.post<BackendAIResponse>('/ai/generate-suggestion', {
            prompt,
            system_instruction: 'You are an expert community builder and educator. Return compact valid JSON only.',
        });

        return parseRoadmapJson(result.data.text || '');
    } catch (err) {
        console.warn('Roadmap AI fallback used:', err);
        return fallbackRoadmap(data);
    }
}
