import React, { useState, useEffect } from 'react';
import {
    List,
    Section,
    Cell,
    Input,
    Button,
    Text,
    Headline,
    Placeholder,
    Avatar,
    Tappable,
    Modal,
    Select,
    Radio,
    Switch,
    Textarea,
    FixedLayout
} from '@telegram-apps/telegram-ui';
import { Plus, BookOpen, Search, Trash2, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { CharCounter } from '../../components/CharCounter';

interface NewCourse {
    title: string;
    description: string;
    cover_url: string;
    unlock_type: string;
    unlock_value: string;
    is_published: boolean;
}

const SectionHeader = () => <div style={{ height: 16 }} />;

export const Courses: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [newCourse, setNewCourse] = useState<NewCourse>({
        title: '',
        description: '',
        cover_url: '',
        unlock_type: 'open',
        unlock_value: '1',
        is_published: false
    });

    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/courses');
            setCourses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!newCourse.title) return;
        try {
            const res = await api.post('/courses', newCourse);
            setCourses([...courses, res.data]);
            setIsCreateModalOpen(false);
            setNewCourse({
                title: '',
                description: '',
                cover_url: '',
                unlock_type: 'open',
                unlock_value: '1',
                is_published: false
            });
            // According to App.tsx, the admin route for course editor is /courses/:id
            navigate(`/courses/${res.data.id}`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (!confirm('Удалить курс? Это действие нельзя отменить.')) return;
        try {
            await api.delete(`/courses/${id}`);
            setCourses(courses.filter(c => c.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDuplicateCourse = async (id: string) => {
        try {
            const res = await api.post(`/courses/${id}/duplicate`);
            setCourses([...courses, res.data]);
        } catch (err) {
            console.error(err);
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <React.Fragment>
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
                                onClick={() => navigate(`/courses/${course.id}`)}
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
            </List>

            <Modal
                header={
                    <Modal.Header
                        after={
                            <Tappable onClick={(e) => e.stopPropagation()} style={{ color: 'var(--tg-theme-link-color)', fontSize: 14, padding: '0 8px' }}>
                                Import with key
                            </Tappable>
                        }
                    >
                        Add course
                    </Modal.Header>
                }
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            >
                <List style={{ paddingBottom: 100 }}>
                    <Section>
                        <Input
                            placeholder="Course name"
                            value={newCourse.title}
                            onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value.slice(0, 50) })}
                        />
                        <div style={{ padding: '4px 16px' }}>
                            <CharCounter current={newCourse.title.length} max={50} />
                        </div>

                        <Textarea
                            placeholder="Course description"
                            value={newCourse.description}
                            onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value.slice(0, 500) })}
                            style={{ minHeight: 100 }}
                        />
                        <div style={{ padding: '4px 16px' }}>
                            <CharCounter current={(newCourse.description || '').length} max={500} />
                        </div>
                    </Section>

                    <Section header="Access Settings">
                        <Cell
                            before={<Radio name="unlock_type" value="open" checked={newCourse.unlock_type === 'open'} onChange={() => setNewCourse({ ...newCourse, unlock_type: 'open' })} />}
                            description="All members can access."
                            onClick={() => setNewCourse({ ...newCourse, unlock_type: 'open' })}
                        >
                            Open
                        </Cell>
                        <Cell
                            before={<Radio name="unlock_type" value="level_based" checked={newCourse.unlock_type === 'level_based'} onChange={() => setNewCourse({ ...newCourse, unlock_type: 'level_based' })} />}
                            description="Members unlock at a specific level."
                            onClick={() => setNewCourse({ ...newCourse, unlock_type: 'level_based' })}
                        >
                            Level unlock
                        </Cell>
                        <Cell
                            before={<Radio name="unlock_type" value="payment_based" checked={newCourse.unlock_type === 'payment_based'} onChange={() => setNewCourse({ ...newCourse, unlock_type: 'payment_based' })} />}
                            description="Members pay a 1-time price to unlock."
                            onClick={() => setNewCourse({ ...newCourse, unlock_type: 'payment_based' })}
                        >
                            Buy now
                        </Cell>
                        <Cell
                            before={<Radio name="unlock_type" value="time_relative" checked={newCourse.unlock_type === 'time_relative'} onChange={() => setNewCourse({ ...newCourse, unlock_type: 'time_relative' })} />}
                            description="Members unlock after x days."
                            onClick={() => setNewCourse({ ...newCourse, unlock_type: 'time_relative' })}
                        >
                            Time unlock
                        </Cell>
                        <Cell
                            before={<Radio name="unlock_type" value="private" checked={newCourse.unlock_type === 'private'} onChange={() => setNewCourse({ ...newCourse, unlock_type: 'private' })} />}
                            description="Members on a tier or specific members."
                            onClick={() => setNewCourse({ ...newCourse, unlock_type: 'private' })}
                        >
                            Private
                        </Cell>
                    </Section>

                    {newCourse.unlock_type === 'level_based' && (
                        <Section header="Access starts at level">
                            <Select
                                value={newCourse.unlock_value || '1'}
                                onChange={(e) => setNewCourse({ ...newCourse, unlock_value: e.target.value })}
                            >
                                {[1, 2, 3, 4, 5, 10, 15, 20].map(lv => (
                                    <option key={lv} value={lv.toString()}>{lv}</option>
                                ))}
                            </Select>
                        </Section>
                    )}

                    <Section>
                        <Cell
                            after={<Switch checked={false} disabled />}
                            description="Standard tier"
                        >
                            Or members on/above
                        </Cell>
                    </Section>

                    <Section header="Cover">
                        <Text weight="3" style={{ fontSize: 12, color: 'var(--tg-theme-hint-color)', padding: '0 16px 8px' }}>
                            1460 x 752 px
                        </Text>
                        <div style={{ padding: '0 16px' }}>
                            <div style={{
                                width: '100%',
                                height: 140,
                                backgroundColor: 'var(--tg-theme-secondary-bg-color)',
                                borderRadius: 12,
                                border: '2px dashed var(--tg-theme-hint-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                opacity: 0.6
                            }}>
                                <Text color="link">Upload</Text>
                            </div>
                            <Button mode="bezeled" size="s" stretched style={{ marginTop: 8 }}>
                                CHANGE
                            </Button>
                        </div>
                    </Section>

                    <Section>
                        <Cell
                            after={<Switch checked={newCourse.is_published} onChange={(e) => setNewCourse({ ...newCourse, is_published: e.target.checked })} />}
                        >
                            <Text weight="2" style={{ color: newCourse.is_published ? 'var(--tg-theme-button-color)' : 'inherit' }}>
                                Published
                            </Text>
                        </Cell>
                    </Section>
                </List>

                <FixedLayout vertical="bottom" style={{
                    padding: '16px',
                    backgroundColor: 'var(--tg-theme-bg-color)',
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    zIndex: 100
                }}>
                    <Button
                        size="l"
                        stretched
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreateCourse(); }}
                        disabled={!newCourse.title}
                        mode="gray"
                    >
                        ADD
                    </Button>
                </FixedLayout>
            </Modal>
        </React.Fragment>
    );
};
