import React from 'react';
import { WandSparkles } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSearchParams } from 'react-router-dom';

import { CourseStructureGenerationDialog } from './course-generation/CourseStructureGenerationDialog';
import { CourseGenerationStatusPanel } from './course-editor/CourseGenerationStatusPanel';
import { CoursePlanEmptyState } from './course-editor/CoursePlanEmptyState';
import { CourseEditorSkeleton } from './course-editor/CourseEditorSkeleton';
import { LessonGenerationDialog } from './course-editor/LessonGenerationDialog';
import { ModuleDialog } from './course-editor/ModuleDialog';
import { SortableModule } from './course-editor/SortableModule';
import { useCourseEditor } from './course-editor/useCourseEditor';
import { useCourseStructureGenerationJob } from './course-generation/useCourseStructureGenerationJob';
import { useLessonGenerationJob } from './course-editor/useLessonGenerationJob';
import { buildOpenNotebookUrl } from './course-sources/openNotebookReference';

export const CourseEditor: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const editor = useCourseEditor();
    const courseStructureGeneration = useCourseStructureGenerationJob({ onCompleted: editor.refreshCourseData });
    const lessonGeneration = useLessonGenerationJob({ onCompleted: editor.refreshCourseData });
    const {
        state: courseStructureGenerationState,
        start: startCourseStructureGeneration,
        watch: watchCourseStructureGeneration,
        loadLatest: loadLatestCourseStructureGeneration,
        checkStatus: checkCourseStructureGenerationStatus,
        resume: resumeCourseStructureGeneration,
        isResuming: isResumingCourseStructureGeneration,
        reset: resetCourseStructureGeneration,
    } = courseStructureGeneration;
    const [moduleForGeneration, setModuleForGeneration] = React.useState<(typeof editor.modules)[number] | null>(null);
    const [isCourseGenerationOpen, setIsCourseGenerationOpen] = React.useState(false);
    const watchedGenerationJobIdRef = React.useRef<string | null>(null);
    const loadedLatestCourseIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        const generationJobId = searchParams.get('generationJobId');
        if (!generationJobId || watchedGenerationJobIdRef.current === generationJobId) return;
        watchedGenerationJobIdRef.current = generationJobId;
        watchCourseStructureGeneration(generationJobId);
    }, [searchParams, watchCourseStructureGeneration]);

    React.useEffect(() => {
        if (!editor.courseId) return;
        if (courseStructureGenerationState.status !== 'idle') return;
        if (loadedLatestCourseIdRef.current === editor.courseId) return;
        loadedLatestCourseIdRef.current = editor.courseId;
        void loadLatestCourseStructureGeneration(editor.courseId);
    }, [
        courseStructureGenerationState.status,
        editor.courseId,
        loadLatestCourseStructureGeneration,
    ]);

    React.useEffect(() => {
        const generationJobId = searchParams.get('generationJobId');
        if (!generationJobId) return;
        if (!['completed', 'failed'].includes(courseStructureGenerationState.status)) return;

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('generationJobId');
        setSearchParams(nextParams, { replace: true });
    }, [courseStructureGenerationState.status, searchParams, setSearchParams]);

    if (editor.isLoading) return <CourseEditorSkeleton />;

    const openNotebookUrl = buildOpenNotebookUrl(
        editor.course?.open_notebook_id || courseStructureGenerationState.notebook_url
    );

    return (
        <div className="min-h-dvh overflow-x-clip bg-background pb-32 animate-in fade-in duration-500">
            <header className="sticky top-0 z-50 bg-background/90 ios-blur border-b border-border px-4 pt-5 pb-4">
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => editor.navigate('/courses')}
                        className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                        aria-label="Вернуться к курсам"
                    >
                        <span className="material-symbols-outlined text-2xl">arrow_back_ios_new</span>
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold truncate">{editor.course?.title || 'Редактор курса'}</h1>
                        <p className="text-sm text-muted-foreground font-medium">Учебный план</p>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-xl space-y-3 px-3 py-6 sm:px-4">
                {editor.modules.length > 0 && (
                    <CourseGenerationStatusPanel
                        state={courseStructureGenerationState}
                        onCheckStatus={checkCourseStructureGenerationStatus}
                        onOpenDetails={() => setIsCourseGenerationOpen(true)}
                        isResuming={isResumingCourseStructureGeneration}
                        onResume={(includeSourceGaps) => {
                            void resumeCourseStructureGeneration(courseStructureGenerationState.id, includeSourceGaps);
                        }}
                    />
                )}

                {editor.modules.length === 0 ? (
                    <CoursePlanEmptyState
                        generationState={courseStructureGenerationState}
                        openNotebookUrl={openNotebookUrl}
                        isAddingLesson={editor.isCreatingFirstLesson}
                        onAddModule={editor.openNewModuleModal}
                        onAddLesson={editor.createFirstLesson}
                        onGenerateFromSource={() => {
                            resetCourseStructureGeneration();
                            setIsCourseGenerationOpen(true);
                        }}
                        onOpenDetails={() => setIsCourseGenerationOpen(true)}
                        onCheckStatus={checkCourseStructureGenerationStatus}
                    />
                ) : (
                    <DndContext
                        sensors={editor.sensors}
                        collisionDetection={closestCenter}
                        onDragStart={editor.handleDragStart}
                        onDragOver={editor.handleDragOver}
                        onDragEnd={editor.handleDragEnd}
                        onDragCancel={editor.handleDragCancel}
                    >
                        <SortableContext items={editor.modules.map(m => m.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {editor.modules.map((module) => (
                                    <SortableModule
                                        key={module.id}
                                        module={module}
                                        courseId={editor.courseId!}
                                        isExpanded={editor.expandedModules.has(module.id)}
                                        onToggle={() => editor.toggleModule(module.id)}
                                        onAddLesson={() => editor.navigate(`/courses/${editor.courseId}/lessons/new?moduleId=${module.id}`)}
                                        onGenerateLessons={() => setModuleForGeneration(module)}
                                        onTogglePublish={editor.handleTogglePublish}
                                        onDeleteModule={editor.handleDeleteModule}
                                        onDeleteLesson={editor.handleDeleteLesson}
                                        onEditSettings={() => editor.openEditModuleModal(module)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        onClick={editor.openNewModuleModal}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-xs font-medium text-muted-foreground transition-all hover:border-primary/25 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 active:scale-[0.99]"
                    >
                        <span className="material-symbols-outlined">create_new_folder</span>
                        Добавить модуль
                    </button>
                    <button
                        onClick={() => {
                            resetCourseStructureGeneration();
                            setIsCourseGenerationOpen(true);
                        }}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 text-xs font-medium text-primary transition-all hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 active:scale-[0.99]"
                    >
                        <WandSparkles size={15} />
                        Из источника
                    </button>
                </div>
            </main>

            <CourseStructureGenerationDialog
                open={isCourseGenerationOpen}
                courseId={editor.courseId || ''}
                courseTitle={editor.course?.title}
                generationState={courseStructureGenerationState}
                onOpenChange={setIsCourseGenerationOpen}
                onSubmit={(input) => {
                    if (!editor.courseId) return;
                    setIsCourseGenerationOpen(false);
                    void startCourseStructureGeneration(editor.courseId, input).then((job) => {
                        if (!job?.id) return;
                        watchedGenerationJobIdRef.current = job.id;
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set('generationJobId', job.id);
                        setSearchParams(nextParams, { replace: true });
                    });
                }}
                onCheckStatus={checkCourseStructureGenerationStatus}
                isResuming={isResumingCourseStructureGeneration}
                onResume={(includeSourceGaps) => {
                    void resumeCourseStructureGeneration(courseStructureGenerationState.id, includeSourceGaps);
                }}
                onReset={resetCourseStructureGeneration}
            />

            <ModuleDialog
                open={editor.isModuleModalOpen}
                editingModule={editor.editingModule}
                moduleForm={editor.moduleForm}
                onOpenChange={(open) => {
                    if (!open) editor.closeModuleModal();
                    else editor.setIsModuleModalOpen(true);
                }}
                onFormChange={editor.setModuleForm}
                onSave={editor.saveModule}
                onDelete={editor.handleDeleteModule}
                onGenerateStructure={() => {
                    editor.closeModuleModal();
                    resetCourseStructureGeneration();
                    setIsCourseGenerationOpen(true);
                }}
            />

            <LessonGenerationDialog
                open={Boolean(moduleForGeneration)}
                courseId={editor.courseId || ''}
                moduleTitle={moduleForGeneration?.title}
                generationState={lessonGeneration.state}
                onOpenChange={(open) => {
                    if (!open) setModuleForGeneration(null);
                }}
                onSubmit={(input) => {
                    if (!moduleForGeneration) return;
                    void lessonGeneration.start(moduleForGeneration.id, input);
                }}
                onCheckStatus={lessonGeneration.checkStatus}
                onReset={lessonGeneration.reset}
            />
        </div>
    );
};
