import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Card } from '../../components/ui/card';

export const ProfileView: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    return (
        <section className="space-y-6">
            <div className="flex items-center gap-4 px-1">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="-ml-2">
                    <ChevronLeft size={20} />
                </Button>
                <h2 className="text-xl font-bold">Your Profile</h2>
            </div>

            <div className="space-y-4">
                <Card className="p-6 flex flex-col items-center gap-4 text-center">
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg">{user?.username}</h3>
                        <p className="text-sm text-muted-foreground">{user?.first_name} {user?.last_name}</p>
                    </div>
                    <Button variant="destructive" className="w-full mt-4" onClick={() => { logout(); navigate('/'); }}>
                        Log Out
                    </Button>
                </Card>
            </div>
        </section>
    );
};
