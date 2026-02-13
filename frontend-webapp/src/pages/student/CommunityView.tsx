import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export const CommunityView: React.FC = () => {
    const navigate = useNavigate();
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4 px-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-xl font-bold">Сообщество</h2>
            </div>

            <Card className="border-none bg-primary/5 p-12 text-center flex flex-col items-center gap-4">
                <Users size={48} className="text-primary/40" />
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">Скоро</h3>
                    <p className="text-sm text-muted-foreground">Лента сообщества появится в следующем обновлении.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>Назад</Button>
            </Card>
        </section>
    );
};
