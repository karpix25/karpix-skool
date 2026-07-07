import React from 'react';

import { InlineAlert } from '../../components/ui/inline-alert';
import { AnnounceDialog } from './courses/AnnounceDialog';
import { CourseFilters } from './courses/CourseFilters';
import { CourseFormDialog } from './courses/CourseFormDialog';
import { CoursesGrid } from './courses/CoursesGrid';
import { CoursesHeader } from './courses/CoursesHeader';
import { useCourses } from './courses/useCourses';

export const Courses: React.FC = () => {
    const courses = useCourses();

    return (
        <div className="flex flex-col min-h-dvh animate-in fade-in duration-500">
            <CoursesHeader
                searchQuery={courses.searchQuery}
                onSearchChange={courses.setSearchQuery}
                onCreate={() => courses.setIsCreateModalOpen(true)}
            />

            {courses.pageFeedback && (
                <div className="px-6 pt-4">
                    <InlineAlert
                        key={courses.pageFeedback.id}
                        variant={courses.pageFeedback.variant}
                        title={courses.pageFeedback.title}
                        description={courses.pageFeedback.description}
                        onDismiss={courses.clearFeedback}
                    />
                </div>
            )}

            <CourseFilters activeFilter={courses.activeFilter} onFilterChange={courses.setActiveFilter} />

            <CoursesGrid
                loading={courses.loading}
                courses={courses.filteredCourses}
                searchQuery={courses.searchQuery}
                onToggleStatus={courses.handleToggleStatus}
                onDelete={courses.handleDeleteCourse}
                onDuplicate={courses.handleDuplicateCourse}
                onEdit={courses.handleOpenEditModal}
                onAnnounce={courses.handleOpenAnnounceModal}
                onClick={(id: string) => courses.navigate(`/courses/${id}`)}
            />

            <CourseFormDialog
                open={courses.isCreateModalOpen}
                editingCourseId={courses.editingCourseId}
                course={courses.newCourse}
                fileInputRef={courses.fileInputRef}
                isUploading={courses.isUploading}
                isSubmitting={courses.isSubmitting}
                canSubmit={courses.canSubmitCourse}
                createMode={courses.createMode}
                generationForm={courses.generationForm}
                onClose={courses.closeModal}
                onSubmit={courses.handleSubmit}
                onCourseChange={courses.setNewCourse}
                onCreateModeChange={courses.setCreateMode}
                onGenerationFormChange={courses.setGenerationForm}
                onThumbnailUpload={courses.handleThumbnailUpload}
            />

            <AnnounceDialog
                open={courses.isAnnounceModalOpen}
                course={courses.announcingCourse}
                message={courses.announceMessage}
                isAnnouncing={courses.isAnnouncing}
                feedback={courses.announceFeedback}
                onOpenChange={(open) => !open && courses.closeAnnounceModal()}
                onMessageChange={courses.setAnnounceMessage}
                onAnnounce={courses.handleAnnounce}
                onFeedbackDismiss={courses.clearFeedback}
            />
        </div>
    );
};
