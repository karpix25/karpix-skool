import React, { useState, useEffect } from 'react';
import {
    List,
    Section,
    Cell,
    Button,
    Input,
    Text,
    Headline,
    Avatar,
    Placeholder,
    Modal,
    Tappable,
    Select
} from '@telegram-apps/telegram-ui';
import {
    Plus,
    Search,
    Copy,
    Trash2,
    BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const Courses: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [newCourse, setNewCourse] = useState({
        title: '',
        description: '',
        cover_url: '',
        unlock_type: 'open',
        unlock_value: ''
    });

    const navigate = useNavigate();
    const { } = useAuth(); // We might need values from auth later

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/admin/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async () => {
        if (!newCourse.title) return;
        try {
            const res = await api.post('/admin/courses', newCourse);
            setCourses([...courses, res.data]);
            setIsCreateModalOpen(false);
            setNewCourse({ title: '', description: '', cover_url: '', unlock_type: 'open', unlock_value: '' });
            navigate(`/admin/course/${res.data.id}`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Удалить курс? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/admin/courses/${id}`);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDuplicateCourse = async (id: string) => {
        try {
            const res = await api.post(`/admin/courses/${id}/duplicate`);
            setCourses([...courses, res.data]);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <List>
            <SectionHeader />
            <Section>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Headline weight="1">Ваши курсы</Headline>
                        <Button
                            size="s"
                            mode="filled"
                            onClick={() => setIsCreateModalOpen(true)}
                            before={<Plus size={18} />}
                        >
                            Создать
                        </Button>
                    </div>
                    <Input
                        before={<Search size={18} style={{ color: 'var(--tg-theme-hint-color)' }} />}
                        placeholder="Поиск курсов..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </Section>

            <Section header={`Всего: ${filteredCourses.length}`}>
                {loading ? (
                    <Placeholder description="Загрузка курсов...">
                        <div style={{ animation: 'spin 1s linear infinite' }}><BookOpen size={32} /></div>
                    </Placeholder>
                ) : filteredCourses.length === 0 ? (
                    <Placeholder
                        header="Курсы не найдены"
                        description={searchQuery ? "Попробуйте изменить запрос" : "Создайте свой первый курс"}
                    >
                        <BookOpen size={48} style={{ opacity: 0.1 }} />
                    </Placeholder>
                ) : (
                    filteredCourses.map(course => (
                        <Cell
                            key={course.id}
                            before={
                                <Avatar
                                    size={48}
                                    src={course.cover_url}
                                    fallbackIcon={<BookOpen size={24} />}
                                />
                            }
                            description={course.description || "Нет описания"}
                            after={
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <Tappable onClick={(e) => { e.stopPropagation(); handleDuplicateCourse(course.id); }} style={{ padding: 8, opacity: 0.6 }}>
                                        <Copy size={18} />
                                    </Tappable>
                                    <Tappable onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} style={{ padding: 8, opacity: 1, color: 'var(--tg-theme-destructive-text-color)' }}>
                                        <Trash2 size={18} />
                                    </Tappable>
                                </div>
                            }
                            onClick={() => navigate(`/admin/course/${course.id}`)}
                            multiline
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Text weight="2">{course.title}</Text>
                                {!course.is_published && (
                                    <span style={{ fontSize: 10, backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--tg-theme-hint-color)' }}>
                                        Черновик
                                    </span>
                                )}
                            </div>
                        </Cell>
                    ))
                )}
            </Section>

            {/* Create Modal */}
            <Modal
                header={<Modal.Header>Новый курс</Modal.Header>}
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            >
                <List style={{ paddingBottom: 20 }}>
                    <Section header="Основная информация">
                        <Input
                            header="Название"
                            placeholder="Напр., Основы Python"
                            value={newCourse.title}
                            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                        />
                        <Input
                            header="Описание (краткое)"
                            placeholder="О чем этот курс?"
                            value={newCourse.description}
                            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                        />
                    </Section>

                    <Section header="Условия доступа">
                        <Select
                            header="Тип доступа"
                            value={newCourse.unlock_type}
                            onChange={(e) => setNewCourse({ ...newCourse, unlock_type: e.target.value })}
                        >
                            <option value="open">Открытый</option>
                            <option value="level_based">По рейтингу (Level)</option>
                            <option value="time_relative">По времени (Drip)</option>
                            <option value="payment_based">Платный</option>
                            <option value="private">Приватный</option>
                        </Select>
                    </Section>

                    {(newCourse.unlock_type === 'level_based' || newCourse.unlock_type === 'time_relative') && (
                        <Section header="Настройка ограничения">
                            {newCourse.unlock_type === 'level_based' && (
                                <Input
                                    header="Минимальный уровень"
                                    type="number"
                                    placeholder="Напр., 5"
                                    value={newCourse.unlock_value}
                                    onChange={(e) => setNewCourse({ ...newCourse, unlock_value: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                            {newCourse.unlock_type === 'time_relative' && (
                                <Input
                                    header="Доступ через (дней)"
                                    type="number"
                                    placeholder="Напр., 3"
                                    value={newCourse.unlock_value}
                                    onChange={(e) => setNewCourse({ ...newCourse, unlock_value: e.target.value })}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </Section>
                    )}

                    <div style={{ padding: '0 16px', marginTop: 12 }}>
                        <Button
                            size="l"
                            stretched
                            onClick={handleCreateCourse}
                            disabled={!newCourse.title}
                        >
                            Создать и редактировать
                        </Button>
                    </div>
                </List>
            </Modal>
        </List>
    );
};

// Helper to fix spacing
const SectionHeader = () => <div style={{ height: 16 }} />;
