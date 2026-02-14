# Plan: Custom Level Names per School (Tenant)

## 1. Overview
The goal is to allow School Admins to customize the names of levels (1-9) for their specific school. Currently, these names are hardcoded in the frontend. We will move this configuration to the database (`Tenant` table) and provide an interface for admins to edit them.

## 2. Database Changes
We will add a `level_names` column to the `Tenant` table to store a JSON object mapping level numbers to custom names.

- **Table**: `tenant`
- **Column**: `level_names` (JSONB)
- **Default**: `NULL` (Frontend will use hardcoded defaults if this is null or keys are missing)
- **Example Value**: `{"1": "Новичок", "2": "Стажер", ..., "9": "Грандмастер"}`

## 3. Backend Changes

### 3.1. Models (`app/models.py`)
- Update `Tenant` model to include `level_names` field.

### 3.2. API (`app/routes/webapp.py`)
- Update `/me` endpoint to return the tenant's `level_names` configuration along with user data. This ensures the frontend has the correct names immediately upon load.

### 3.3. API (`app/routes/admin.py`)
- Add or update an endpoint (e.g., `PUT /admin/settings`) to allow admins to modify the `level_names` for their tenant.
- Validation: Ensure all 9 levels have names (or rely on defaults for missing ones).

## 4. Frontend Changes

### 4.1. Context & State (`AuthContext.tsx`)
- Update `AuthContext` to store `levelNames` from the `/me` response.
- Provide a helper function `getLevelName(level: number): string` that checks the context first, then falls back to defaults.

### 4.2. Admin UI (`SettingsView.tsx` or new component)
- Add a new section "Настройки уровней" (Level Settings).
- Create a form with 9 inputs (Level 1 - Level 9).
- Load current values from the backend.
- Save button to update the configuration.

### 4.3. Student UI (`LevelProgressModal.tsx`, `ProfileHeader.tsx`)
- Replace hardcoded level names with the dynamic `getLevelName(level)` helper from context.

## 5. Implementation Steps
1.  **Migration**: Create Alembic migration to add `level_names` to `tenant`.
2.  **Backend**: Update models and API endpoints.
3.  **Frontend Logic**: Update `AuthContext` to handle dynamic names.
4.  **Admin UI**: Build the settings form.
5.  **Student UI**: Connect components to dynamic names.
6.  **Verify**: Test changing names as admin and seeing them update as student.
