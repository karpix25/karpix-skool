# Plan: Course Creation Fix and Condition Settings Restoration

The goal is to fix the error during course creation and restore/implement the ability to configure course and module unlock conditions (rating and duration of stay).

## User Review Required

> [!IMPORTANT]
> The course creation error might be caused by missing database columns if they were recently added to the model but not migrated. I will add manual migration steps.
> I will also update the UI to support `level_based` (rating) and `time_relative` (duration) unlock types.

## Proposed Changes

### Backend
#### [MODIFY] [db.py](file:///Users/nadaraya/Desktop/СКУЛ/backend/app/db.py)
- Add manual migrations to ensure `Course` and `Module` tables have `unlock_type` and `unlock_value` columns.

#### [MODIFY] [courses.py](file:///Users/nadaraya/Desktop/СКУЛ/backend/app/routes/courses.py)
- Improve `create_course` to handle cases where a user (like SuperAdmin) might not have a tenant directly assigned, or allow passing `tenant_id`.
- Ensure all unlock types are correctly handled in Pydantic models.

### Frontend
#### [MODIFY] [Courses.tsx](file:///Users/nadaraya/Desktop/СКУЛ/frontend-webapp/src/admin/pages/Courses.tsx)
- Add `level_based` and `time_relative` options to the "Тип доступа" radio group.
- Add an input field for `unlock_value` when these types are selected (e.g., "Required Level" or "Days after join").

#### [MODIFY] [CourseEditor.tsx](file:///Users/nadaraya/Desktop/СКУЛ/frontend-webapp/src/admin/pages/CourseEditor.tsx)
- Implement UI for editing Folder (Module) unlock conditions.
- Add a settings modal or expand the existing menu to allow changing `unlock_type` and `unlock_value` for modules.

## Verification Plan

### Automated Tests
- Run backend verification scripts if available.
- Test course creation via API post directly.

### Manual Verification
1. Open "Courses" page.
2. Try creating a new course with "Open" access.
3. Try creating a new course with "Level Based" access and set a value.
4. Verify that the course is created correctly.
5. Open "Course Editor" for a course.
6. Check if folder (module) settings allow setting unlock conditions.
7. Verify that saving these conditions works (checks backend API).
