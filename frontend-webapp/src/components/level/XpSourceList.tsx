import React from 'react';
import { BookOpenCheck, CircleCheckBig, MessageCircle, SmilePlus } from 'lucide-react';
import type { WebAppXpSource, XpSourceType } from '../../types/levels';

interface XpSourceListProps {
    sources: WebAppXpSource[];
}

const sourceIcons: Record<XpSourceType, React.ElementType> = {
    lesson: BookOpenCheck,
    quiz_question: CircleCheckBig,
    message: MessageCircle,
    reaction: SmilePlus,
};

export const XpSourceList: React.FC<XpSourceListProps> = ({ sources }) => {
    if (!sources.length) return null;

    return (
        <section className="border-t border-border/70 pt-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Как начисляется опыт</h3>
            <div className="space-y-2">
                {sources.map((source) => {
                    const Icon = sourceIcons[source.source_type];
                    return (
                        <div
                            key={source.source_type}
                            className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-card p-3"
                        >
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">{source.title}</p>
                                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                                        {source.description}
                                    </p>
                                    {source.limit && (
                                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                            Лимит: {source.limit}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <span className="shrink-0 rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                                +{source.points} XP
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
