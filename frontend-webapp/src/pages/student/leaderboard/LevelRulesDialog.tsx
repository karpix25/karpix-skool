import React from 'react';
import { Button } from '../../../components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../../components/ui/dialog';
import { DEFAULT_XP_SOURCES } from '../../../components/level/defaultXpSources';

export const LevelRulesDialog: React.FC = () => (
    <Dialog>
        <DialogTrigger asChild>
            <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Открыть правила уровней и рейтинга"
                className="h-11 w-11 rounded-full border-border/70 bg-muted text-base font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            >
                <span aria-hidden="true">?</span>
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Как работает рейтинг Karpix</DialogTitle>
                <DialogDescription>
                    XP показывает учебную активность внутри школы. Рейтинг помогает видеть темп, но не заменяет
                    прохождение уроков и практику.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm leading-6">
                <section className="rounded-xl border border-border/70 bg-muted/35 p-4">
                    <h3 className="font-semibold text-foreground">Уровни</h3>
                    <p className="mt-1 text-muted-foreground">
                        Уровень растет от общего XP. Прогресс под профилем показывает, сколько осталось до следующего
                        уровня в этой школе.
                    </p>
                </section>

                <section className="space-y-2">
                    <h3 className="font-semibold text-foreground">Базовые источники XP</h3>
                    <div className="space-y-2">
                        {DEFAULT_XP_SOURCES.map((source) => (
                            <div
                                key={source.source_type}
                                className="flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-foreground">{source.title}</p>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        {source.description}
                                        {source.limit ? ` ${source.limit}.` : ''}
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground">
                                    {source.points} XP
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-xl border border-border/70 bg-muted/35 p-4">
                    <h3 className="font-semibold text-foreground">Периоды рейтинга</h3>
                    <p className="mt-1 text-muted-foreground">
                        В карточках за 7 и 30 дней считается XP за период. В рейтинге за все время показывается общий
                        XP ученика.
                    </p>
                </section>
            </div>

            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" className="w-full sm:w-auto">
                        Понятно
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
