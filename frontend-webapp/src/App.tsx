import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, Lock } from 'lucide-react';
import { Button } from './components/ui/button';
import WebApp from '@twa-dev/sdk';
import { cn } from './lib/utils';
import './index.css';

// Admin Pages
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import { Courses as AdminCourses } from './pages/admin/Courses';
import { CourseEditor as AdminCourseEditor } from './pages/admin/CourseEditor';
import { LessonEditor as AdminLessonEditor } from './pages/admin/LessonEditor';
import { Students as AdminStudents } from './pages/admin/Students';
import { Settings as AdminSettings } from './pages/admin/Settings';
import { SuperAdmin as AdminSuperAdmin } from './pages/super-admin/SuperAdmin';
import { Layout as AdminLayout } from './admin/components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';

// Student Pages
import { Onboarding } from './pages/student/Onboarding';
import { Dashboard as StudentDashboard } from './pages/student/Dashboard';
import { CoursesView as StudentCoursesView } from './pages/student/CoursesView';
import { LeaderboardView as StudentLeaderboardView } from './pages/student/LeaderboardView';
import { CourseDetail as StudentCourseDetail } from './pages/student/CourseDetail';
import { LessonView as StudentLessonView } from './pages/student/LessonView';
import { LegalPage } from './pages/legal/LegalPage';
import { StudentLayout } from './pages/student/components/StudentLayout';

const Main: React.FC = () => {
  const { user, membership, isLoading, isAdmin, isSuperAdmin, viewMode, login } = useAuth();

  const needsOnboarding = !isAdmin && !membership && !user?.is_super_admin;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-primary">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-skool-navy flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
        <div className="max-w-xs w-full space-y-8">
          <div className="w-24 h-24 bg-skool-blue/10 text-skool-blue rounded-[32px] flex items-center justify-center mx-auto shadow-2xl shadow-skool-blue/20 rotate-3">
            <Lock size={40} strokeWidth={2.5} />
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold text-white tracking-tight uppercase">Доступ ограничен</h1>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Пожалуйста, откройте это приложение через меню Telegram бота или по прямой ссылке вашей школы.
            </p>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-12 p-8 benefit-card rounded-[32px] border border-white/5 space-y-6 shadow-2xl">
              <div className="space-y-1 text-left">
                <p className="text-[10px] font-black text-skool-blue uppercase tracking-[0.2em]">Developer Tool</p>
                <h2 className="text-lg font-bold text-white">Local Bypass</h2>
              </div>
              <Button
                onClick={() => {
                  login().catch(e => alert("Ошибка входа: " + e.message));
                }}
                className="w-full h-14 bg-skool-blue hover:bg-skool-blue/90 rounded-2xl font-bold shadow-lg shadow-skool-blue/20"
              >
                Auth Bypass
              </Button>
            </div>
          )}
        </div>

        <div className="fixed bottom-8 w-32 h-1.5 bg-white/5 rounded-full mx-auto"></div>
      </div>
    );
  }

  // Admin routing
  if (viewMode === 'admin' && isAdmin) {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={isSuperAdmin ? <AdminSuperAdmin /> : <AdminDashboard />} />
          <Route path="/analytics" element={<AdminDashboard />} />
          <Route path="/courses" element={<AdminCourses />} />
          <Route path="/courses/:id" element={<AdminCourseEditor />} />
          <Route path="/students" element={<AdminStudents />} />
          <Route path="/settings" element={<AdminSettings />} />
          <Route path="/super" element={<AdminSuperAdmin />} />
        </Route>
        <Route path="/courses/:courseId/lessons/:lessonId" element={<AdminLessonEditor />} />
        <Route path="/course/:id" element={<StudentCourseDetail />} />
        <Route path="/lesson/:id" element={<StudentLessonView />} />
      </Routes>
    );
  }

  // Student routing / Onboarding
  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<StudentLayout><StudentDashboard /></StudentLayout>} path="/" />
      <Route element={<StudentLayout><StudentCoursesView /></StudentLayout>} path="/courses" />
      <Route element={<StudentLayout><StudentLeaderboardView /></StudentLayout>} path="/leaderboard" />
      <Route path="/course/:id" element={<StudentCourseDetail />} />
      <Route path="/lesson/:id" element={<StudentLessonView />} />
      <Route path="/apply" element={<Onboarding />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [appearance, setAppearance] = useState<'light' | 'dark'>(WebApp.colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

    const handleThemeChange = () => {
      const isDark = WebApp.colorScheme === 'dark';
      setAppearance(isDark ? 'dark' : 'light');

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    handleThemeChange();

    WebApp.onEvent('themeChanged', handleThemeChange);
    return () => {
      WebApp.offEvent('themeChanged', handleThemeChange);
    };
  }, []);

  return (
    <div className={cn("min-h-screen", appearance)}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background text-foreground transition-colors duration-200 antialiased selection:bg-primary/10">
            <Main />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
};

export default App;
