import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import WebApp from '@twa-dev/sdk';
import './index.css';

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then((module) => ({ default: module.Dashboard })));
const AdminCourses = lazy(() => import('./pages/admin/Courses').then((module) => ({ default: module.Courses })));
const AdminCourseEditor = lazy(() => import('./pages/admin/CourseEditor').then((module) => ({ default: module.CourseEditor })));
const AdminLessonEditor = lazy(() => import('./pages/admin/LessonEditor').then((module) => ({ default: module.LessonEditor })));
const AdminStudents = lazy(() => import('./pages/admin/Students').then((module) => ({ default: module.Students })));
const AdminTeam = lazy(() => import('./pages/admin/Team').then((module) => ({ default: module.Team })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((module) => ({ default: module.Settings })));
const AdminSuperAdmin = lazy(() => import('./pages/super-admin/SuperAdmin').then((module) => ({ default: module.SuperAdmin })));
const AdminLayout = lazy(() => import('./admin/components/layout/Layout').then((module) => ({ default: module.Layout })));
const TenantContextGate = lazy(() => import('./pages/super-admin/super-admin/TenantContextGate').then((module) => ({ default: module.TenantContextGate })));
import { LoginPage } from './pages/auth/LoginPage';
import { DesktopAuth } from './pages/auth/DesktopAuth';

// Student Pages
import { LandingPage } from './pages/landing/LandingPage';
const Onboarding = lazy(() => import('./pages/student/Onboarding').then((module) => ({ default: module.Onboarding })));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard').then((module) => ({ default: module.Dashboard })));
const StudentCoursesView = lazy(() => import('./pages/student/CoursesView').then((module) => ({ default: module.CoursesView })));
const StudentLeaderboardView = lazy(() => import('./pages/student/LeaderboardView').then((module) => ({ default: module.LeaderboardView })));
const StudentCourseDetail = lazy(() => import('./pages/student/CourseDetail').then((module) => ({ default: module.CourseDetail })));
const StudentLessonView = lazy(() => import('./pages/student/LessonView').then((module) => ({ default: module.LessonView })));
const ProfileView = lazy(() => import('./pages/student/ProfileView').then((module) => ({ default: module.ProfileView })));
const StudentLayout = lazy(() => import('./pages/student/components/StudentLayout').then((module) => ({ default: module.StudentLayout })));
import { LegalPage } from './pages/legal/LegalPage';

const PageLoader: React.FC = () => (
  <div className="flex min-h-[50vh] w-full items-center justify-center bg-background text-primary">
    <Loader2 className="animate-spin" size={32} />
  </div>
);

const Main: React.FC = () => {
  const { user, membership, isLoading, canAccessAdminMode, isPlatformAdmin, isSuperAdmin, viewMode } = useAuth();

  const needsOnboarding = !canAccessAdminMode && !membership && !user?.is_super_admin;

  const requireTenantForPlatform = (element: React.ReactNode, title: string) => (
    isPlatformAdmin ? <TenantContextGate title={title}>{element}</TenantContextGate> : element
  );

  if (isLoading) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background text-primary">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/desktop" element={<DesktopAuth />} />
        <Route path="/legal" element={<LegalPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  // Admin routing
  if (viewMode === 'admin' && canAccessAdminMode) {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/" element={isSuperAdmin ? <AdminSuperAdmin /> : <AdminDashboard />} />
          <Route path="/analytics" element={<AdminDashboard />} />
          <Route path="/courses" element={requireTenantForPlatform(<AdminCourses />, 'Контент школы')} />
          <Route path="/courses/:id" element={requireTenantForPlatform(<AdminCourseEditor />, 'Редактор курса')} />
          <Route path="/students" element={requireTenantForPlatform(<AdminStudents />, 'Студенты школы')} />
          <Route path="/team" element={requireTenantForPlatform(<AdminTeam />, 'Команда школы')} />
          <Route path="/settings" element={requireTenantForPlatform(<AdminSettings />, 'Настройки школы')} />
          <Route path="/super" element={isSuperAdmin ? <AdminSuperAdmin /> : <Navigate to="/" replace />} />
        </Route>
        <Route path="/courses/:courseId/lessons/:lessonId" element={requireTenantForPlatform(<AdminLessonEditor />, 'Редактор урока')} />
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
      <Route path="/auth/desktop" element={<DesktopAuth />} />
      <Route path="/profile" element={<StudentLayout><ProfileView /></StudentLayout>} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';
    document.documentElement.classList.remove('dark');

    const handleThemeChange = () => {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';
    };

    handleThemeChange();

    WebApp.onEvent('themeChanged', handleThemeChange);
    return () => {
      WebApp.offEvent('themeChanged', handleThemeChange);
    };
  }, []);

  return (
    <div className="min-h-dvh">
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-dvh bg-background text-foreground transition-colors duration-200 antialiased selection:bg-primary/10">
            <Suspense fallback={<PageLoader />}>
              <Main />
            </Suspense>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
};

export default App;
