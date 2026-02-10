import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, BookOpen, ChevronRight, PlayCircle, Lock, CheckCircle, ChevronLeft, Rocket } from 'lucide-react';
import api from './api/client';
import {
  Button
} from './components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from './components/ui/card';
import { Progress } from './components/ui/progress';
import { Badge } from './components/ui/badge';
import WebApp from '@twa-dev/sdk';
import './index.css';

// Admin Imports
import { Dashboard as AdminDashboard } from './admin/pages/Dashboard';
import { Courses as AdminCourses } from './admin/pages/Courses';
import { CourseEditor as AdminCourseEditor } from './admin/pages/CourseEditor';
import { Students as AdminStudents } from './admin/pages/Students';
import { SuperAdmin as AdminSuperAdmin } from './admin/pages/SuperAdmin';
import { Layout as AdminLayout } from './admin/components/Layout';
import { Onboarding } from './pages/Onboarding';
import { ProfileHeader } from './components/ProfileHeader';

// --- Components ---

const CourseCard: React.FC<{ course: any }> = ({ course }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all cursor-pointer bg-card"
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <div className="flex flex-col sm:flex-row h-full">
        <div className="w-full sm:w-48 h-48 sm:h-auto bg-muted overflow-hidden shrink-0">
          {course.cover_url ? (
            <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
              <BookOpen size={48} />
            </div>
          )}
        </div>
        <CardContent className="flex-1 p-6 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {course.title}
              </h3>
              <ChevronRight size={20} className="text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {course.description || "Нажмите, чтобы начать обучение."}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Прогресс</span>
              <span className="text-primary">{course.progress_percent || 0}%</span>
            </div>
            <Progress value={Number(course.progress_percent || 0)} className="h-1.5" />
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

const CourseList: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/webapp/courses')
      .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 pb-32">
      <ProfileHeader />

      {(!user?.admin_status || user?.admin_status === 'none') && !isAdmin && (
        <Card className="bg-primary text-primary-foreground border-none overflow-hidden shadow-lg shadow-primary/20">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Rocket size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Готовы запустить свою школу?</h2>
              <p className="text-primary-foreground/80 text-sm">Создайте свое сообщество и начните зарабатывать на своих знаниях сегодня.</p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto px-10 font-bold uppercase tracking-widest text-xs"
              onClick={() => navigate('/apply')}
            >
              Запустить школу
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Доступные курсы ({courses.length})</h2>
        </div>

        {courses.length === 0 ? (
          <Card className="border-dashed bg-transparent p-20 text-center flex flex-col items-center justify-center space-y-4 opacity-50">
            <BookOpen size={64} className="text-muted-foreground/20" />
            <div className="space-y-1">
              <h3 className="font-bold text-lg">Курсов пока нет</h3>
              <p className="text-sm">Ожидайте обновлений от автора</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>

      <div className="pt-8 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-40">
        POWERED BY SKOOL
      </div>
    </div>
  );
};

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/webapp/courses/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!data) return <div className="p-20 text-center text-muted-foreground font-bold italic">Курс не найден</div>;

  return (
    <div className="max-w-3xl mx-auto pb-32 min-h-screen">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ChevronLeft size={24} />
        </Button>
        <h1 className="font-bold text-lg truncate flex-1">{data.course.title}</h1>
      </div>

      <div className="px-4 py-8 space-y-8">
        <Card className="border-none shadow-sm bg-card overflow-hidden">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
              <span>Общий прогресс</span>
              <span className="text-primary">{data.progress_percent}%</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Progress value={Number(data.progress_percent)} className="h-2" />
          </CardContent>
        </Card>

        <div className="space-y-8">
          {data.modules.map((module: any) => (
            <div key={module.id} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">{module.title}</h3>
                  {module.is_locked && <Lock size={14} className="text-orange-500" />}
                </div>
              </div>

              <div className="grid gap-3">
                {module.lessons.map((lesson: any) => (
                  <Card
                    key={lesson.id}
                    className={cn(
                      "border-none shadow-sm transition-all overflow-hidden",
                      module.is_locked ? "opacity-60 grayscale cursor-not-allowed" : "hover:shadow-md hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={() => !module.is_locked && navigate(`/lesson/${lesson.id}`)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        lesson.is_completed ? "bg-green-500 text-white" :
                          module.is_locked ? "bg-muted text-muted-foreground/40" : "bg-primary/10 text-primary"
                      )}>
                        {lesson.is_completed ? <CheckCircle size={18} /> :
                          module.is_locked ? <Lock size={16} /> : <PlayCircle size={20} />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-sm truncate">{lesson.title}</h4>
                      </div>
                      {!module.is_locked && <ChevronRight size={16} className="text-muted-foreground/30" />}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {module.is_locked && module.lock_reason && (
                <p className="px-4 text-[11px] font-medium text-orange-500 bg-orange-500/10 py-2 rounded-lg inline-block">
                  ⚠️ {module.lock_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LessonView: React.FC = () => {
  const { id } = useParams();
  const { refreshProfile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/webapp/lessons/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await api.post(`/webapp/lessons/${id}/complete`);
      setData((prev: any) => ({ ...prev, is_completed: true }));
      await refreshProfile();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen bg-background"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  if (!data) return <div className="p-20 text-center text-muted-foreground font-bold italic">Урок не найден</div>;

  if (data.is_locked) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-screen text-center space-y-6">
        <div className="w-20 h-20 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center">
          <Lock size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Доступ закрыт</h2>
          <p className="text-muted-foreground text-sm max-w-xs">{data.lock_reason || 'Этот урок пока недоступен.'}</p>
        </div>
        <Button size="lg" className="px-10 rounded-full" onClick={() => navigate('/')}>
          Вернуться к списку
        </Button>
      </div>
    );
  }

  const lesson = data.lesson;

  return (
    <div className="flex flex-col min-h-screen max-w-4xl mx-auto bg-background">
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b px-4 h-16 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/course/${data.course_id}`)}>
          <ChevronLeft size={24} />
        </Button>
        <h1 className="font-bold text-lg truncate flex-1">{lesson.title}</h1>
      </div>

      <div className="flex-1 space-y-0">
        {lesson.video_id && (
          <div className="w-full aspect-video bg-black shadow-2xl relative overflow-hidden flex items-center justify-center">
            {lesson.video_provider === 'youtube_unlisted' ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${lesson.video_id}`}
                title="Video"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="text-white text-sm opacity-50 italic">Плеер {lesson.video_provider} не поддерживается</div>
            )}
          </div>
        )}

        <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-8">
          <h2 className="text-3xl font-bold tracking-tight">{lesson.title}</h2>

          <article className="prose prose-slate dark:prose-invert max-w-none pb-40 text-foreground leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: lesson.content || '<p class="text-muted-foreground italic">Контент пуст.</p>' }} />
          </article>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-50">
        <div className="max-w-3xl mx-auto flex gap-4">
          <Button
            size="lg"
            className="flex-1 h-12 font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/10"
            disabled={data.is_completed || isCompleting}
            onClick={handleComplete}
            variant={data.is_completed ? 'secondary' : 'default'}
          >
            {isCompleting ? <Loader2 className="animate-spin h-4 w-4" /> :
              data.is_completed ? (
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span>Урок пройден</span>
                </div>
              ) : 'Завершить урок'}
          </Button>

          {data.next_lesson_id && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-12 font-bold uppercase tracking-widest text-[10px] rounded-xl"
              onClick={() => navigate(`/lesson/${data.next_lesson_id}`)}
            >
              Следующий урок <ChevronRight size={14} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const { user, membership, isLoading, isAdmin, viewMode, login } = useAuth();

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
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/courses" element={<AdminCourses />} />
          <Route path="/courses/:id" element={<AdminCourseEditor />} />
          <Route path="/students" element={<AdminStudents />} />
          <Route path="/super" element={<AdminSuperAdmin />} />
        </Route>
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/lesson/:id" element={<LessonView />} />
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
      <Route path="/" element={<CourseList />} />
      <Route path="/course/:id" element={<CourseDetail />} />
      <Route path="/lesson/:id" element={<LessonView />} />
      <Route path="/apply" element={<Onboarding />} />
      <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <CourseList />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [appearance, setAppearance] = useState<'light' | 'dark'>(WebApp.colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    // Sync with Telegram theme colors but prioritize our design
    document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

    const handleThemeChange = () => {
      setAppearance(WebApp.colorScheme === 'dark' ? 'dark' : 'light');
    };

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
