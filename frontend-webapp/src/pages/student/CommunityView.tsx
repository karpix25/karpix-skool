import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export const CommunityView: React.FC = () => {
    const navigate = useNavigate();
    return (
        <section className="space-y-6 overflow-x-clip">
            <div className="flex items-center gap-4 px-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-xl font-semibold">Сообщество</h2>
            </div>

            <Card className="flex flex-col items-center gap-4 rounded-xl border-border/70 bg-card p-8 text-center min-[380px]:p-10">
                <Users size={42} className="text-primary/50" />
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Скоро</h3>
                    <p className="text-sm text-muted-foreground">Лента сообщества появится в следующем обновлении.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>Назад</Button>
            </Card>
        </section>
    );
};
