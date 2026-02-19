import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
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
import { LandingPage } from './pages/landing/LandingPage';
import { Onboarding } from './pages/student/Onboarding';
import { Dashboard as StudentDashboard } from './pages/student/Dashboard';
import { CoursesView as StudentCoursesView } from './pages/student/CoursesView';
import { LeaderboardView as StudentLeaderboardView } from './pages/student/LeaderboardView';
import { CourseDetail as StudentCourseDetail } from './pages/student/CourseDetail';
import { LessonView as StudentLessonView } from './pages/student/LessonView';
import { LegalPage } from './pages/legal/LegalPage';
import { ProfileView } from './pages/student/ProfileView';
import { StudentLayout } from './pages/student/components/StudentLayout';

const Main: React.FC = () => {
  const { user, membership, isLoading, isAdmin, isSuperAdmin, viewMode } = useAuth();

  const needsOnboarding = !isAdmin && !membership && !user?.is_super_admin;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-primary">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
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
        <Route path="/apply" element={<Onboarding />} />
        <Route path="*" element={<LandingPage />} />
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
      <Route path="/profile" element={<StudentLayout><ProfileView /></StudentLayout>} />
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
