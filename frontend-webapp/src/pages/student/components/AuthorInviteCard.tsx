import React from 'react';
import { ChevronRight, PenLine } from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

interface AuthorInviteCardProps {
    onOpen: () => void;
}

export const AuthorInviteCard: React.FC<AuthorInviteCardProps> = ({ onOpen }) => (
    <Card className="p-5">
        <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PenLine size={20} />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
                <div>
                    <h4 className="font-semibold text-sm">Стать автором школы</h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        Если хотите делиться знаниями и запускать свои курсы, оставьте заявку.
                    </p>
                </div>
                <Button variant="outline" className="w-full justify-between rounded-xl" onClick={onOpen}>
                    Подать заявку
                    <ChevronRight size={16} />
                </Button>
            </div>
        </div>
    </Card>
);
