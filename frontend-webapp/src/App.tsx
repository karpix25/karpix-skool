import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, BookOpen, ChevronRight, PlayCircle, Lock, CheckCircle, ChevronLeft, Rocket } from 'lucide-react';
import api from './api/client';
import '@telegram-apps/telegram-ui/dist/styles.css';
import {
  AppRoot,
  Section,
  Cell,
  List,
  Button,
  Progress,
  Text,
  Badge,
  Placeholder
} from '@telegram-apps/telegram-ui';
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
    <Cell
      before={
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-tg-secondary shrink-0">
          {course.cover_url ? (
            <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-blue-500">
              <BookOpen size={24} />
            </div>
          )}
        </div>
      }
      after={<ChevronRight size={20} className="text-tg-hint/30" />}
      description={course.description || "Нажмите, чтобы начать обучение."}
      onClick={() => navigate(`/course/${course.id}`)}
      className="active:bg-tg-secondary/50"
      multiline
    >
      <div className="flex flex-col gap-1">
        <Text weight="2">{course.title}</Text>
        <div className="flex items-center gap-2">
          <Progress value={Number(course.progress_percent || 0)} style={{ height: 4, flex: 1 }} />
          <Text weight="3" color="hint">{course.progress_percent || 0}%</Text>
        </div>
      </div>
    </Cell>
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

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-tg-link" size={32} /></div>;

  return (
    <List style={{ paddingBottom: 80 }}>
      <ProfileHeader />

      {/* Onboarding Banner for existing students */}
      {(!user?.admin_status || user?.admin_status === 'none') && !isAdmin && (
        <Section>
          <div className="p-4">
            <Button
              size="l"
              stretched
              mode="filled"
              onClick={() => navigate('/apply')}
              before={<Rocket size={20} />}
              style={{ borderRadius: 16 }}
            >
              Запустите свою школу
            </Button>
          </div>
        </Section>
      )}

      <Section header="Доступные курсы">
        {courses.length === 0 ? (
          <Placeholder
            header="Курсов пока нет"
            description="Ожидайте обновлений от автора"
          >
            <BookOpen size={48} className="opacity-10" />
          </Placeholder>
        ) : (
          courses.map(course => (
            <Link key={course.id} to={`/course/${course.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <CourseCard course={course} />
            </Link>
          ))
        )}
      </Section>

      <div className="p-4 text-center">
        <Text color="hint">Всего курсов: {courses.length}</Text>
      </div>
    </List>
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

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-tg-link" size={32} /></div>;
  if (!data) return <div className="p-8 text-center text-tg-text">Курс не найден</div>;

  return (
    <List>
      <Section>
        <Cell
          before={<ChevronLeft size={24} onClick={() => navigate('/')} className="cursor-pointer" />}
          after={<div className="w-6" />} // Spacer
        >
          <div className="text-center font-bold">{data.course.title}</div>
        </Cell>
      </Section>

      <Section header="Ваш прогресс">
        <Cell>
          <div className="flex flex-col gap-2 w-full">
            <div className="flex justify-between items-center h-4">
              <Text weight="2" color="hint" caps>ПРОЙДЕНО</Text>
              <Text weight="2" color="link">{data.progress_percent}%</Text>
            </div>
            <Progress value={Number(data.progress_percent)} />
          </div>
        </Cell>
      </Section>

      {data.modules.map((module: any) => (
        <Section
          key={module.id}
          header={
            <div className="flex items-center justify-between w-full">
              <span>{module.title}</span>
              {module.is_locked && <Lock size={14} className="text-orange-400" />}
            </div>
          }
          footer={module.is_locked && module.lock_reason ? module.lock_reason : undefined}
        >
          {module.lessons.map((lesson: any) => (
            <Link
              key={lesson.id}
              to={module.is_locked ? '#' : `/lesson/${lesson.id}`}
              onClick={(e) => module.is_locked && e.preventDefault()}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Cell
                before={
                  lesson.is_completed ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <CheckCircle size={16} />
                    </div>
                  ) : module.is_locked ? (
                    <div className="w-6 h-6 rounded-full bg-tg-hint/10 flex items-center justify-center text-tg-hint">
                      <Lock size={12} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-tg-link/10 flex items-center justify-center text-tg-link">
                      <PlayCircle size={16} />
                    </div>
                  )
                }
                after={!module.is_locked && <ChevronRight size={18} className="text-tg-hint/30" />}
                disabled={module.is_locked}
                className={module.is_locked ? 'opacity-50' : ''}
              >
                {lesson.title}
              </Cell>
            </Link>
          ))}
        </Section>
      ))}
    </List>
  );
};

const LessonView: React.FC = () => {
  const { id } = useParams();
  const { refreshProfile } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
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
      const res = await api.post(`/webapp/lessons/${id}/complete`);
      setData((prev: any) => ({ ...prev, is_completed: true }));
      await refreshProfile();
      if (res.data.xp_granted > 0) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-tg-link" size={32} /></div>;
  if (!data) return <div className="p-8 text-center text-tg-text">Урок не найден</div>;

  if (data.is_locked) {
    return (
      <Placeholder
        header="Доступ закрыт"
        description={data.lock_reason || 'Этот урок пока недоступен.'}
        action={<Button size="l" stretched onClick={() => navigate('/')}>Вернуться</Button>}
      >
        <Lock size={48} className="text-orange-500" />
      </Placeholder>
    );
  }

  const lesson = data.lesson;

  return (
    <div className="flex flex-col min-h-screen">
      <Section>
        <Cell
          before={<ChevronLeft size={24} onClick={() => navigate(`/course/${data.course_id}`)} className="cursor-pointer" />}
          after={<div className="w-6" />}
        >
          <div className="text-center font-bold px-4 truncate">{lesson.title}</div>
        </Cell>
      </Section>

      {lesson.video_id && (
        <div className="w-full aspect-video bg-black shadow-lg">
          {lesson.video_provider === 'youtube_unlisted' ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${lesson.video_id}`}
              title="Video"
              frameBorder="0"
              allowFullScreen
            ></iframe>
          ) : (
            <Placeholder description={`Плеер ${lesson.video_provider} не поддерживается`} />
          )}
        </div>
      )}

      <div className="p-6 prose prose-slate dark:prose-invert max-w-none pb-32 text-tg-text">
        <div dangerouslySetInnerHTML={{ __html: lesson.content || '<p class="text-tg-hint italic">Контент пуст.</p>' }} />
      </div>

      {showCelebration && (
        <Badge
          type="dot"
          style={{ position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}
        >
          🎉 +10 XP!
        </Badge>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-secondary/80 backdrop-blur-lg border-t border-tg-hint/10 flex flex-col gap-3">
        <div className="flex gap-3">
          <Button
            size="l"
            stretched
            disabled={data.is_completed || isCompleting}
            onClick={handleComplete}
            mode={data.is_completed ? 'bezeled' : 'filled'}
            loading={isCompleting}
            before={data.is_completed ? <CheckCircle size={20} /> : undefined}
          >
            {data.is_completed ? 'Завершено' : 'Завершить урок'}
          </Button>

          {data.next_lesson_id && (
            <Button
              size="l"
              stretched
              mode="gray"
              onClick={() => navigate(`/lesson/${data.next_lesson_id}`)}
              after={<ChevronRight size={20} />}
            >
              Далее
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const { user, membership, isLoading, isAdmin, viewMode, login } = useAuth();

  // If user has NO membership and is NOT an admin/superadmin, show Onboarding
  const needsOnboarding = !isAdmin && !membership && !user?.is_super_admin;

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 text-blue-600">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
          <h1 className="text-xl font-bold mb-2 text-red-700">Доступ запрещен</h1>
          <p className="text-red-600/70">Пожалуйста, откройте это приложение из меню Telegram бота.</p>
        </div>

        {import.meta.env.DEV && (
          <div className="mt-8 p-6 bg-white rounded-3xl border border-blue-100 shadow-sm w-full max-w-xs">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Инструменты разработки</p>
            <button
              id="dev-bypass-btn"
              onClick={() => {
                console.log("DEV: Clicked bypass button");
                alert("Кнопка нажата!");
                login().catch(e => alert("Ошибка входа: " + e.message));
              }}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all shadow-lg shadow-blue-100"
            >
              (Dev Only) Обход входа
            </button>
          </div>
        )}
      </div>
    );
  }

  console.log("DEBUG FRONTEND RENDER:", { isAdmin, viewMode, userId: user.id });

  // If Admin is in admin view mode, show admin routes
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
        {/* Support switching back to student view */}
        <Route path="/student-preview" element={<CourseList />} />
        {/* If no admin route matches, might be a student route */}
        <Route path="/course/:id" element={<CourseDetail />} />
        <Route path="/lesson/:id" element={<LessonView />} />
      </Routes>
    );
  }

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
      {/* Fallback for admin routes if they are in student mode */}
      <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <CourseList />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [appearance, setAppearance] = useState<'light' | 'dark'>(WebApp.colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    // Set initial body background
    document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';

    const handleThemeChange = () => {
      setAppearance(WebApp.colorScheme === 'dark' ? 'dark' : 'light');
      document.body.style.backgroundColor = 'var(--tg-theme-bg-color)';
    };

    // Listen for theme changes
    WebApp.onEvent('themeChanged', handleThemeChange);
    return () => {
      WebApp.offEvent('themeChanged', handleThemeChange);
    };
  }, []);

  return (
    <AppRoot appearance={appearance}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-tg-bg text-tg-text transition-colors duration-200">
            <Main />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </AppRoot>
  );
};

export default App;
