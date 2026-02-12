import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

export const LeaderboardView: React.FC = () => {
    const navigate = useNavigate();
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4 px-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-xl font-bold">Leaderboard</h2>
            </div>

            <Card className="border-none bg-primary/5 p-12 text-center flex flex-col items-center gap-4">
                <Trophy size={48} className="text-primary/40" />
                <div className="space-y-1">
                    <h3 className="font-bold text-lg">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground">The full leaderboard logic is under development.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/')}>Back to Dashboard</Button>
            </Card>
        </section>
    );
};
