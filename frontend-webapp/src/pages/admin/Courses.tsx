import React from 'react';

import { AnnounceDialog } from './courses/AnnounceDialog';
import { CourseFilters } from './courses/CourseFilters';
import { CourseFormDialog } from './courses/CourseFormDialog';
import { CoursesGrid } from './courses/CoursesGrid';
import { CoursesHeader } from './courses/CoursesHeader';
import { useCourses } from './courses/useCourses';

export const Courses: React.FC = () => {
    const courses = useCourses();

    return (
        <div className="flex flex-col min-h-screen animate-in fade-in duration-500">
            <CoursesHeader
                searchQuery={courses.searchQuery}
                onSearchChange={courses.setSearchQuery}
                onCreate={() => courses.setIsCreateModalOpen(true)}
            />

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
                onClose={courses.closeModal}
                onSubmit={courses.handleSubmit}
                onCourseChange={courses.setNewCourse}
                onThumbnailUpload={courses.handleThumbnailUpload}
            />

            <AnnounceDialog
                open={courses.isAnnounceModalOpen}
                course={courses.announcingCourse}
                message={courses.announceMessage}
                isAnnouncing={courses.isAnnouncing}
                onOpenChange={(open) => !open && courses.setIsAnnounceModalOpen(false)}
                onMessageChange={courses.setAnnounceMessage}
                onAnnounce={courses.handleAnnounce}
            />
        </div>
    );
};
