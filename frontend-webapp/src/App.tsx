import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, BookOpen, ChevronRight, PlayCircle, Lock, CheckCircle, ChevronLeft } from 'lucide-react';
import api from './api/client';
import './index.css';

// Admin Imports
import { Dashboard as AdminDashboard } from './admin/pages/Dashboard';
import { Courses as AdminCourses } from './admin/pages/Courses';
import { CourseEditor as AdminCourseEditor } from './admin/pages/CourseEditor';
import { Students as AdminStudents } from './admin/pages/Students';
import { SuperAdmin as AdminSuperAdmin } from './admin/pages/SuperAdmin';
import { Layout as AdminLayout } from './admin/components/Layout';

// --- Components ---

const ProfileHeader: React.FC = () => {
  const { membership } = useAuth();
  if (!membership) return null;

  const currentXp = membership.xp;
  const level = membership.level;
  const xpForNextLevel = level * 50;
  // Progress is from (level-1)*50 up to level*50
  const prevLevelXp = (level - 1) * 50;
  const progressInLevel = currentXp - prevLevelXp;
  const progressPercent = Math.min(Math.max((progressInLevel / 50) * 100, 0), 100);

  return (
    <div className="bg-white p-4 pt-6 pb-4 border-b sticky top-0 z-10 shadow-sm">
      <div className="flex justify-between items-end mb-2">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Прогресс</span>
          <h2 className="text-xl font-bold">Уровень {level}</h2>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-gray-400">{currentXp} / {xpForNextLevel} Опыт</span>
        </div>
      </div>
      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

const CourseList: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get('/webapp/courses')
      .then(res => {
        setCourses(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error('Ошибка загрузки:', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-8 text-center h-screen flex items-center justify-center bg-[#F9F9F9]"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <ProfileHeader />

      <div className="p-6 space-y-8 max-w-xl mx-auto w-full">
        {/* Courses Grid (Single Column for Mobile) */}
        <div className="space-y-6">
          {courses.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] border border-gray-100 shadow-sm text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-200" />
              <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Нет доступных курсов</p>
            </div>
          ) : (
            courses.map(course => (
              <Link
                key={course.id}
                to={`/course/${course.id}`}
                className="block bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-all group"
              >
                {/* Card Image */}
                <div className="aspect-[16/10] w-full overflow-hidden bg-gray-50">
                  {course.cover_url ? (
                    <img
                      src={course.cover_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E85D7A] flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-black/5" />
                      <BookOpen size={48} className="text-white/20" />
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-8 space-y-2">
                  <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase leading-tight">
                    {course.title}
                  </h2>
                  <p className="text-[15px] font-medium text-gray-400 line-clamp-3 leading-snug italic">
                    {course.description || "Изучите материалы курса, руководства и задания."}
                  </p>

                  {/* Progress Pill */}
                  <div className="pt-4">
                    <div className="w-full h-10 bg-[#EAEAEA] rounded-full relative overflow-hidden flex items-center px-5">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#F3D382] transition-all duration-700"
                        style={{ width: `${course.progress_percent}%` }}
                      />
                      <span className="relative text-[11px] font-black text-gray-500 uppercase tracking-widest">
                        {course.progress_percent || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Pagination (Geometric Design) */}
        {courses.length > 0 && (
          <div className="pt-4 pb-12 flex flex-col items-center gap-8 translate-y-2">
            <div className="flex items-center gap-6">
              <button className="flex items-center gap-1.5 text-gray-300 font-bold text-sm disabled:opacity-30" disabled>
                <ChevronLeft size={16} /> Назад
              </button>

              <div className="w-10 h-10 rounded-full bg-[#F3D382] text-[#8E7024] flex items-center justify-center text-sm font-black shadow-lg shadow-yellow-200/50">
                1
              </div>

              <button className="flex items-center gap-1.5 text-gray-400 hover:text-gray-900 font-bold text-sm transition-colors">
                Вперед <ChevronRight size={16} />
              </button>
            </div>

            <div className="text-[11px] font-black text-gray-300 uppercase tracking-widest">
              1-{courses.length} из {courses.length}
            </div>
          </div>
        )}
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

  if (isLoading) return <div className="p-8 text-center h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!data) return <div className="p-8">Курс не найден</div>;

  return (
    <div className="flex flex-col min-h-screen">
      <ProfileHeader />
      <div className="p-4 pb-20">
        <Link to="/" className="text-blue-600 text-sm font-medium mb-4 inline-block">← Назад к курсам</Link>
        <h1 className="text-2xl font-bold mb-2">{data.course.title}</h1>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-gray-500">Прогресс курса</span>
            <span className="text-xs font-bold text-gray-500">{data.progress_percent}%</span>
          </div>
          <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden mb-1">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${data.progress_percent}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 font-medium">
            Пройдено {data.completed_lessons} из {data.total_lessons} уроков
          </p>
        </div>

        <div className="space-y-6">
          {data.modules && Array.isArray(data.modules) ? data.modules.map((module: any) => (
            <div key={module.id} className={module.is_locked ? 'opacity-70' : ''}>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{module.title}</h2>
                {module.is_locked && (
                  <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Lock size={10} /> {module.lock_reason}
                  </span>
                )}
              </div>
              <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${module.is_locked ? 'bg-gray-50/50' : ''}`}>
                {module.lessons && Array.isArray(module.lessons) ? module.lessons.map((lesson: any, idx: number) => (
                  <Link
                    key={lesson.id}
                    to={module.is_locked ? '#' : `/lesson/${lesson.id}`}
                    onClick={(e) => module.is_locked && e.preventDefault()}
                    className={`flex items-center justify-between p-4 active:bg-gray-50 transition-colors ${idx !== module.lessons.length - 1 ? 'border-b border-gray-50' : ''} ${module.is_locked ? 'cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {module.is_locked ? (
                        <Lock size={20} className="text-gray-300" />
                      ) : lesson.is_completed ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : (
                        <PlayCircle size={20} className="text-blue-500" />
                      )}
                      <span className={`font-medium ${lesson.is_completed || module.is_locked ? 'text-gray-400' : 'text-gray-700'}`}>{lesson.title}</span>
                    </div>
                    {!module.is_locked && <ChevronRight size={16} className="text-gray-300" />}
                  </Link>
                )) : (
                  <div className="p-4 text-gray-400 text-sm italic text-center">В этом модуле еще нет уроков</div>
                )}
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-gray-500 bg-gray-100 rounded-2xl">
              В этом курсе пока нет модулей.
            </div>
          )}
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

  if (isLoading) return <div className="p-8 text-center h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  if (!data) return <div className="p-8">Урок не найден</div>;

  if (data.is_locked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-gray-50">
        <div className="bg-orange-100 text-orange-600 p-4 rounded-full mb-4">
          <Lock size={48} />
        </div>
        <h1 className="text-xl font-bold mb-2">Урок заблокирован</h1>
        <p className="text-gray-500 mb-6">{data.lock_reason || 'Вам нужно пройти предыдущие шаги, чтобы открыть этот урок.'}</p>
        <Link to="/" className="text-blue-600 font-bold">Вернуться к курсу</Link>
      </div>
    );
  }

  const lesson = data.lesson;
  if (!lesson) return <div className="p-8">Данные урока отсутствуют.</div>;

  return (
    <div className="bg-white min-h-screen">
      <div className="p-4 flex items-center gap-2 border-b">
        <Link to={`/course/${data.course_id}`} className="text-gray-400 p-1"><ChevronRight size={20} className="rotate-180" /></Link>
        <h1 className="font-bold flex-1 truncate">{lesson.title}</h1>
      </div>

      {lesson.video_id && (
        <div className="relative pt-[56.25%] bg-black">
          {lesson.video_provider === 'youtube_unlisted' ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${lesson.video_id}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50">
              Player for {lesson.video_provider} not implemented
            </div>
          )}
        </div>
      )}

      <div className="p-6 prose prose-blue prose-lg max-w-none pb-24">
        <div
          dangerouslySetInnerHTML={{ __html: lesson.content || '<p class="text-gray-400">В этом уроке нет дополнительного контента.</p>' }}
        />
      </div>

      {showCelebration && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-bold px-6 py-3 rounded-full shadow-2xl animate-bounce z-50 flex items-center gap-2 border-4 border-white">
          <span className="text-2xl">🏆</span>
          +10 Опыт получено!
        </div>
      )}

      <div className="p-4 fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t flex gap-3">
        <button
          disabled={data.is_completed || isCompleting}
          onClick={handleComplete}
          className={`font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2 ${data.is_completed
            ? 'bg-green-100 text-green-600 px-6'
            : 'flex-1 bg-blue-600 hover:bg-blue-700 text-white'
            }`}
        >
          {isCompleting ? <Loader2 className="animate-spin" size={20} /> : (
            data.is_completed ? <><CheckCircle size={20} /> Пройдено</> : 'Отметить как пройденный'
          )}
        </button>

        {data.next_lesson_id && (
          <Link
            to={`/lesson/${data.next_lesson_id}`}
            className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2"
          >
            Следующий урок <ChevronRight size={20} />
          </Link>
        )}
      </div>
    </div>
  );
};

const Main: React.FC = () => {
  const { user, isLoading, isAdmin, login } = useAuth();
  const [viewMode, setViewMode] = useState<'student' | 'admin'>('student');

  useEffect(() => {
    if (isAdmin) {
      setViewMode('admin');
    } else {
      setViewMode('student');
    }
  }, [isAdmin]);

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

  // If Admin wants to see student view, they can toggle this (logic added to sidebar later)
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
        {/* Support switching back to student view if needed */}
        <Route path="/student-preview" element={<CourseList />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<CourseList />} />
      <Route path="/course/:id" element={<CourseDetail />} />
      <Route path="/lesson/:id" element={<LessonView />} />
      {/* Fallback for admin routes if they are in student mode */}
      <Route path="/admin/*" element={isAdmin ? <AdminDashboard /> : <CourseList />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
          <Main />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
