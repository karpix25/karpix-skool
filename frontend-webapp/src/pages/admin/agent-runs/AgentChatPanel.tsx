import { type FormEvent, type ReactNode } from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';

import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';
import { CourseSourceComposer } from '../course-sources/CourseSourceComposer';
import { hasCourseGenerationSources } from '../course-sources/sourceValidation';
import type { AgentChatFormState, AgentChatMessage } from './types';

interface AgentChatPanelProps {
    form: AgentChatFormState;
    messages: AgentChatMessage[];
    submitting: boolean;
    onSubmit: () => void;
    onUpdateForm: <Key extends keyof AgentChatFormState>(key: Key, value: AgentChatFormState[Key]) => void;
    onSelectRun: (runId: string) => void;
}

export const AgentChatPanel = ({
    form,
    messages,
    submitting,
    onSubmit,
    onUpdateForm,
    onSelectRun,
}: AgentChatPanelProps) => {
    const hasSources = hasCourseGenerationSources(form.sources);
    const canSubmit = (form.task.trim().length > 0 || hasSources) && !submitting;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
    };

    return (
        <section className="overflow-hidden rounded-lg border border-border/70 bg-card shadow-sm">
            <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-foreground">AI assistant</h2>
                    <p className="truncate text-xs text-muted-foreground">Создание draft курса</p>
                </div>
            </div>

            <div className="max-h-[280px] space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={message.role === 'user'
                            ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                            : 'mr-auto max-w-[85%] rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground'
                        }
                    >
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        {message.runId && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mt-2 h-9 px-2 text-xs"
                                onClick={() => onSelectRun(message.runId!)}
                            >
                                <Sparkles className="h-4 w-4" />
                                Открыть draft
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            <form className="space-y-4 border-t border-border/70 bg-background/70 p-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Задача</Label>
                    <Textarea
                        value={form.task}
                        onChange={(event) => onUpdateForm('task', event.target.value)}
                        placeholder="Создай курс по продажам для новичков"
                        className="min-h-[108px] resize-none rounded-lg"
                    />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Название">
                        <Input
                            value={form.title}
                            onChange={(event) => onUpdateForm('title', event.target.value)}
                            placeholder="Автоматически из задачи"
                        />
                    </Field>
                    <div className="flex items-end justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
                        <Label className="text-xs font-medium text-muted-foreground">VIP</Label>
                        <Switch checked={form.isVip} onCheckedChange={(checked) => onUpdateForm('isVip', checked)} />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Материалы</Label>
                    <CourseSourceComposer
                        disabled={submitting}
                        sources={form.sources}
                        onChange={(sources) => onUpdateForm('sources', sources)}
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Модулей">
                        <Input
                            type="number"
                            min={1}
                            max={12}
                            value={form.moduleCount}
                            onChange={(event) => onUpdateForm('moduleCount', Number(event.target.value))}
                        />
                    </Field>
                    <Field label="Уроков">
                        <Input
                            type="number"
                            min={1}
                            max={12}
                            value={form.lessonsPerModule}
                            onChange={(event) => onUpdateForm('lessonsPerModule', Number(event.target.value))}
                        />
                    </Field>
                    <Field label="Уровень">
                        <Input
                            value={form.audienceLevel}
                            onChange={(event) => onUpdateForm('audienceLevel', event.target.value)}
                        />
                    </Field>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <Field label="Стиль">
                        <Input
                            value={form.style}
                            onChange={(event) => onUpdateForm('style', event.target.value)}
                        />
                    </Field>
                    <Field label="Обложка">
                        <Input
                            value={form.coverUrl}
                            onChange={(event) => onUpdateForm('coverUrl', event.target.value)}
                            placeholder="https://..."
                        />
                    </Field>
                    <Button type="submit" disabled={!canSubmit} className="h-11 self-end">
                        <Send className="h-4 w-4" />
                        {submitting ? 'Запуск' : 'Запустить'}
                    </Button>
                </div>
            </form>
        </section>
    );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <label className="space-y-2">
        <span className="ml-1 block text-xs font-medium text-muted-foreground">{label}</span>
        {children}
    </label>
);
