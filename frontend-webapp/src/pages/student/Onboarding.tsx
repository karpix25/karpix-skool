import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Rocket, ShieldCheck, Clock, CheckCircle, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { cn } from '../../lib/utils';

export const Onboarding: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [schoolName, setSchoolName] = useState('');
    const [details, setDetails] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/auth/request-admin', {
                school_name: schoolName,
                details: details
            });
            setSuccess(true);
            await refreshProfile();
        } catch (err: any) {
            alert('Request failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (user?.admin_status === 'pending' || success) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <Card className="max-w-md w-full border-none shadow-2xl rounded-[40px] overflow-hidden bg-card">
                    <CardContent className="p-10 text-center space-y-8 relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-muted-foreground hover:bg-muted"
                            onClick={() => navigate('/')}
                        >
                            <X size={20} />
                        </Button>

                        <div className="w-24 h-24 bg-primary/5 text-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Clock size={48} strokeWidth={2} />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Request Pending</h1>
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                                Your application to become an author is being reviewed. We'll notify you via Telegram once approved.
                            </p>
                        </div>

                        <div className="pt-4 space-y-4">
                            <Button
                                className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20"
                                onClick={() => refreshProfile()}
                                disabled={isSubmitting}
                            >
                                <RefreshCw size={16} className={cn(isSubmitting && "animate-spin")} /> Refresh Status
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-12 rounded-xl text-muted-foreground font-bold text-[10px] uppercase tracking-widest"
                                onClick={() => navigate('/')}
                            >
                                Return to Courses
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (user?.admin_status === 'rejected') {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6 animate-in fade-in duration-500">
                <Card className="max-w-md w-full border-none shadow-2xl rounded-[40px] overflow-hidden bg-card">
                    <CardContent className="p-10 text-center space-y-8 relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-muted-foreground hover:bg-muted"
                            onClick={() => navigate('/')}
                        >
                            <X size={20} />
                        </Button>

                        <div className="w-24 h-24 bg-red-500/5 text-red-500 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle size={48} strokeWidth={2} />
                        </div>

                        <div className="space-y-3">
                            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Access Restricted</h1>
                            <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                                Unfortunately, your application was not approved. If you believe this is an error, please contact support.
                            </p>
                        </div>

                        <Button
                            variant="ghost"
                            className="w-full h-12 rounded-xl text-muted-foreground font-bold text-[10px] uppercase tracking-widest"
                            onClick={() => navigate('/')}
                        >
                            Return to Learning
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-6 animate-in slide-in-from-bottom-8 duration-700">
            <Card className="max-w-md w-full border-none shadow-2xl rounded-[40px] overflow-hidden bg-card relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-indigo-600"></div>

                <CardContent className="p-10 space-y-10 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-6 right-6 text-muted-foreground hover:bg-muted z-10"
                        onClick={() => navigate('/')}
                    >
                        <X size={20} />
                    </Button>

                    <div className="flex flex-col items-center gap-6 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-primary/20 rotate-3">
                            <Rocket size={40} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-foreground tracking-tight uppercase">Launch Your School</h1>
                            <p className="text-muted-foreground text-sm font-medium">Create courses, teach students, and automate your community on Telegram.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 opacity-60">School Name</label>
                                <Input
                                    placeholder="e.g. Trading Academy"
                                    className="h-14 bg-muted/50 border-none rounded-2xl font-bold text-foreground focus-visible:ring-primary/20 focus-visible:bg-background transition-all"
                                    value={schoolName}
                                    onChange={e => setSchoolName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2.5">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1 opacity-60">Details or Website</label>
                                <Textarea
                                    placeholder="Briefly describe what you teach..."
                                    rows={3}
                                    className="bg-muted/50 border-none rounded-2xl font-bold text-foreground focus-visible:ring-primary/20 focus-visible:bg-background transition-all min-h-[120px] resize-none"
                                    value={details}
                                    onChange={e => setDetails(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-8">
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 rounded-[24px] font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={18} strokeWidth={3} /> Submit Application</>}
                            </Button>

                            <div className="space-y-3 px-1">
                                {[
                                    { icon: Sparkles, text: "Full Content Control" },
                                    { icon: CheckCircle, text: "Gamification & Levels" },
                                    { icon: CheckCircle, text: "Telegram Integration" }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-muted-foreground/60 group">
                                        <item.icon size={16} className="text-primary group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

const RefreshCw: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);
