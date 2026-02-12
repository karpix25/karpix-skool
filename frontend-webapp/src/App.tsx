import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, Lock } from 'lucide-react';
import {
  Button
} from './components/ui/button';
import {
  Card
} from './components/ui/card';
import WebApp from '@twa-dev/sdk';
import { cn } from './lib/utils';
import './index.css';

// Admin Pages
import { Dashboard as AdminDashboard } from './pages/admin/Dashboard';
import { Courses as AdminCourses } from './pages/admin/Courses';
import { CourseEditor as AdminCourseEditor } from './pages/admin/CourseEditor';
import { LessonEditor as AdminLessonEditor } from './pages/admin/LessonEditor';
import { Students as AdminStudents } from './pages/admin/Students';
import { SuperAdmin as AdminSuperAdmin } from './pages/super-admin/SuperAdmin';
import { Layout as AdminLayout } from './admin/components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';

// Student Pages
import { Onboarding } from './pages/student/Onboarding';
import { Dashboard as StudentDashboard } from './pages/student/Dashboard';
import { CoursesView as StudentCoursesView } from './pages/student/CoursesView';
import { LeaderboardView as StudentLeaderboardView } from './pages/student/LeaderboardView';
import { CommunityView as StudentCommunityView } from './pages/student/CommunityView';
import { ProfileView as StudentProfileView } from './pages/student/ProfileView';
import { CourseDetail as StudentCourseDetail } from './pages/student/CourseDetail';
import { LessonView as StudentLessonView } from './pages/student/LessonView';
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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center animate-in fade-in duration-700">
        <Card className="max-w-xs border-none shadow-none bg-transparent space-y-6">
          <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto shadow-sm">
            <Lock size={36} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Доступ запрещен</h1>
            <p className="text-muted-foreground text-sm">Пожалуйста, откройте это приложение из меню Telegram бота.</p>
          </div>
        </Card>

        {import.meta.env.DEV && (
          <div className="mt-12 p-8 bg-card rounded-[32px] border shadow-xl w-full max-w-xs space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Developer Tool</p>
              <h2 className="text-lg font-bold">Local Auth Bypass</h2>
            </div>
            <Button
              onClick={() => {
                login().catch(e => alert("Ошибка входа: " + e.message));
              }}
              className="w-full h-14 rounded-2xl font-bold shadow-lg"
            >
              Auth Bypass
            </Button>
          </div>
        )}
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
      <Route element={<StudentLayout><StudentCommunityView /></StudentLayout>} path="/community" />
      <Route element={<StudentLayout><StudentProfileView /></StudentLayout>} path="/profile" />
      <Route path="/course/:id" element={<StudentCourseDetail />} />
      <Route path="/lesson/:id" element={<StudentLessonView />} />
      <Route path="/apply" element={<Onboarding />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <StudentDashboard />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [appearance, setAppearance] = useState<'light' | 'dark'>(WebApp.colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    // Sync with Telegram theme colors but prioritize our design
    document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

    const handleThemeChange = () => {
      const isDark = WebApp.colorScheme === 'dark';
      setAppearance(isDark ? 'dark' : 'light');

      // Also sync with document element for global Tailwind/CSS detection
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Initial sync
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
