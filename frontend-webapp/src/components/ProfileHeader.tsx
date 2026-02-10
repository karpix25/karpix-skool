import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { LogOut, LayoutDashboard } from 'lucide-react';

export const ProfileHeader: React.FC = () => {
    const { user, membership, logout, isAdmin, setViewMode } = useAuth();
    if (!user || !membership) return null;

    const currentXp = membership.xp || 0;
    const level = membership.level || 1;
    const xpForNextLevel = level * 50;
    const prevLevelXp = (level - 1) * 50;
    const progressInLevel = currentXp - prevLevelXp;
    const progressPercent = Math.min(Math.max((progressInLevel / 50) * 100, 0), 100);

    return (
        <Card className="border-none shadow-none bg-transparent overflow-hidden">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-14 w-14 ring-2 ring-background border-2 border-primary/10">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                                    {user.username?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <Badge className="absolute -bottom-1 -right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px] font-bold shadow-sm">
                                {level}
                            </Badge>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-bold text-lg leading-none">
                                    {user.username || 'Пользователь'}
                                </h2>
                                {user.is_super_admin && (
                                    <Badge variant="destructive" className="text-[9px] uppercase h-4 px-1 leading-none">
                                        Super
                                    </Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-[10px] mt-1 uppercase tracking-widest font-bold">
                                ID: {user.telegram_id}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        onClick={() => { if (confirm('Выйти?')) logout(); }}
                    >
                        <LogOut size={18} />
                    </Button>
                </div>

                <div className="space-y-2 bg-card p-4 rounded-xl shadow-sm border border-border/50">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <span className="text-primary">{currentXp} XP</span>
                        <span>{xpForNextLevel} XP</span>
                    </div>
                    <Progress value={progressPercent} className="h-1.5" />
                </div>

                {isAdmin && (
                    <Button
                        size="sm"
                        variant="secondary"
                        className="w-full font-bold uppercase tracking-widest text-[10px] h-10 shadow-sm border"
                        onClick={() => setViewMode('admin')}
                    >
                        <LayoutDashboard size={14} className="mr-2" />
                        Admin Panel
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};
