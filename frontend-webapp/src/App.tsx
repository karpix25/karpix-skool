import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, BookOpen, ChevronRight, PlayCircle, Lock, CheckCircle, ChevronLeft, Rocket } from 'lucide-react';
import api from './api/client';
import '@telegram-apps/telegram-ui/dist/styles.css';
import { AppRoot } from '@telegram-apps/telegram-ui';
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


const CourseCard: React.FC<{ course: any }> = ({ course }) => (
  <Link
    to={`/course/${course.id}`}
    className="bg-tg-secondary group transition-all active:opacity-80 flex flex-col shadow-sm border-b border-tg-hint/10"
  >
    <div className="aspect-video w-full bg-tg-bg relative">
      {course.cover_url ? (
        <img src={course.cover_url} alt={course.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 opacity-80">
          <BookOpen size={48} className="text-white/30" />
        </div>
      )}
      <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-white text-[11px] font-black tracking-widest uppercase">
        {course.progress_percent || 0}%
      </div>
    </div>
    <div className="p-4 flex flex-col gap-1">
      <h3 className="text-lg font-bold leading-tight text-tg-text">{course.title}</h3>
      <p className="text-[14px] text-tg-hint line-clamp-2 leading-snug">
        {course.description || "Нажмите, чтобы начать обучение."}
      </p>
    </div>
  </Link>
);

const CourseList: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/webapp/courses')
      .then(res => setCourses(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-tg-link" size={32} /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-tg-bg animate-slide-up pb-20">
      <ProfileHeader />

      {/* Onboarding Banner for existing students */}
      {(!user?.admin_status || user?.admin_status === 'none') && !isAdmin && (
        <div className="p-4">
          <Link
            to="/apply"
            className="block w-full bg-gradient-to-r from-[#2481cc] to-[#3e88f7] p-5 rounded-[24px] text-white shadow-xl shadow-blue-100/10 relative overflow-hidden group active:scale-[0.98] transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500"></div>
            <div className="relative z-10 flex items-center justify-between">
              <div className="max-w-[70%]">
                <h3 className="text-lg font-black tracking-tight leading-tight mb-1">Запустите свою школу</h3>
                <p className="text-[13px] opacity-90 font-medium">Создавайте курсы и обучайте своих студентов в Telegram.</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Rocket size={24} strokeWidth={2.5} />
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="flex flex-col bg-tg-secondary">
        {courses.length === 0 ? (
          <div className="p-12 text-center text-tg-hint">
            <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
            <p className="uppercase tracking-widest text-xs font-bold">Курсов пока нет</p>
          </div>
        ) : (
          courses.map(course => <CourseCard key={course.id} course={course} />)
        )}
      </div>
      <div className="p-8 text-center text-[13px] text-tg-hint">
        Всего курсов: {courses.length}
      </div>
    </div>
  );
};

const CourseDetail: React.FC = () => {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get(`/webapp/courses/${id}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-tg-link" size={32} /></div>;
  if (!data) return <div className="p-8 text-center text-tg-text">Курс не найден</div>;

  return (
    <div className="flex flex-col min-h-screen bg-tg-bg animate-slide-up pb-10">
      <div className="bg-tg-secondary/80 backdrop-blur-xl sticky top-0 z-20 border-b border-tg-hint/10 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-tg-link flex items-center gap-1 font-medium">
          <ChevronLeft size={24} className="-ml-2" />
          Назад
        </Link>
        <h1 className="text-[17px] font-semibold text-center truncate px-4 max-w-[200px] text-tg-text">{data.course.title}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Course Header Info */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] text-tg-hint font-medium uppercase tracking-wider">Ваш прогресс</span>
            <span className="text-[13px] font-bold text-tg-link">{data.progress_percent}%</span>
          </div>
          <div className="h-2 w-full bg-tg-secondary rounded-full overflow-hidden border border-tg-hint/10">
            <div className="h-full bg-tg-button transition-all duration-1000" style={{ width: `${data.progress_percent}%` }} />
          </div>
        </div>

        {/* Modules List */}
        <div className="flex flex-col gap-6">
          {data.modules.map((module: any) => (
            <div key={module.id} className="flex flex-col gap-2">
              <h2 className="text-[13px] text-tg-hint font-medium uppercase tracking-wider px-1 flex items-center justify-between">
                {module.title}
                {module.is_locked && <Lock size={14} className="text-orange-400" />}
              </h2>
              <div className="bg-tg-secondary rounded-[14px] border border-tg-hint/10 overflow-hidden flex flex-col">
                {module.lessons.map((lesson: any, idx: number) => (
                  <div key={lesson.id}>
                    <Link
                      to={module.is_locked ? '#' : `/lesson/${lesson.id}`}
                      onClick={(e) => module.is_locked && e.preventDefault()}
                      className={`flex items-center gap-3 p-4 active:bg-tg-bg transition-colors ${module.is_locked ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="relative">
                        {lesson.is_completed ? (
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                            <CheckCircle size={16} />
                          </div>
                        ) : module.is_locked ? (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                            <Lock size={12} />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-tg-button/10 flex items-center justify-center text-tg-button">
                            <PlayCircle size={16} />
                          </div>
                        )}
                      </div>
                      <span className="flex-1 font-medium text-[16px] text-tg-text">{lesson.title}</span>
                      {!module.is_locked && <ChevronRight size={18} className="text-tg-hint/50" />}
                    </Link>
                    {idx < module.lessons.length - 1 && <div className="h-[0.5px] bg-tg-hint/10 ml-12"></div>}
                  </div>
                ))}
              </div>
              {module.is_locked && module.lock_reason && (
                <p className="text-[12px] text-orange-500 font-medium px-1 italic">
                  {module.lock_reason}
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
  const [showCelebration, setShowCelebration] = useState(false);

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
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-tg-bg">
        <div className="bg-orange-100 text-orange-500 p-6 rounded-full mb-6">
          <Lock size={48} />
        </div>
        <h1 className="text-xl font-bold mb-2 text-tg-text">Доступ закрыт</h1>
        <p className="text-tg-hint mb-8">{data.lock_reason || 'Этот урок пока недоступен.'}</p>
        <Link to="/" className="w-full bg-tg-button text-tg-button-text font-bold py-4 rounded-xl active:scale-95 transition-all">Вернуться</Link>
      </div>
    );
  }

  const lesson = data.lesson;

  return (
    <div className="bg-tg-secondary min-h-screen flex flex-col animate-slide-up">
      <div className="bg-tg-secondary/80 backdrop-blur-xl sticky top-0 z-20 border-b border-tg-hint/10 px-4 py-3 flex items-center justify-between">
        <Link to={`/course/${data.course_id}`} className="text-tg-link flex items-center gap-1 font-medium">
          <ChevronLeft size={24} className="-ml-2" />
          Курс
        </Link>
        <h1 className="text-[17px] font-semibold text-center truncate px-4 flex-1 whitespace-nowrap overflow-ellipsis text-tg-text">{lesson.title}</h1>
      </div>

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
            <div className="w-full h-full flex items-center justify-center text-white/50 italic">
              Плеер {lesson.video_provider} не поддерживается
            </div>
          )}
        </div>
      )}

      <div className="p-6 prose prose-slate dark:prose-invert max-w-none pb-32 text-tg-text">
        <div dangerouslySetInnerHTML={{ __html: lesson.content || '<p class="text-tg-hint italic">Контент пуст.</p>' }} />
      </div>

      {showCelebration && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-tg-button text-tg-button-text font-bold px-6 py-3 rounded-full shadow-2xl animate-bounce z-50 flex items-center gap-2 border-2 border-white/20">
          🎉 +10 XP!
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-tg-secondary/80 backdrop-blur-lg border-t border-tg-hint/10 flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            disabled={data.is_completed || isCompleting}
            onClick={handleComplete}
            className={`flex-1 font-bold py-4 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2 ${data.is_completed
              ? 'bg-[#E1F5E6] text-green-600'
              : 'bg-tg-button text-tg-button-text shadow-lg shadow-blue-200/10'
              }`}
          >
            {isCompleting ? <Loader2 className="animate-spin" size={20} /> : (
              data.is_completed ? <><CheckCircle size={20} /> Завершено</> : 'Завершить урок'
            )}
          </button>

          {data.next_lesson_id && (
            <Link
              to={`/lesson/${data.next_lesson_id}`}
              className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-all"
            >
              Далее <ChevronRight size={20} />
            </Link>
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
