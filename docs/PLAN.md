# PLAN - Fixing Deployment TypeScript Errors

The production build failed due to strict TypeScript checks (`tsc -b`). We need to clean up unused variables and fix import styles to satisfy the compiler.

## User Review Required

> [!IMPORTANT]
> This fix removes unused variables and modifies import syntax. It shouldn't change any functionality, but verification is required to ensure no regressions in drag-and-drop or admin views.

## 🎼 Orchestration Strategy

We will use the following agents to resolve the issue:

| Agent | Focus Area | Task |
|-------|------------|------|
| `debugger` | Error Analysis | Identify exact lines and root causes for TypeScript violations. |
| `frontend-specialist` | Implementation | Apply the code fixes to `CourseEditor.tsx` and `Courses.tsx`. |
| `test-engineer` | Verification | Run building scripts to ensure the project compiles successfully. |

## Proposed Changes

### [Component Name] Admin UI

#### [MODIFY] [CourseEditor.tsx](file:///Users/nadaraya/Desktop/СКУЛ/frontend-webapp/src/admin/pages/CourseEditor.tsx)
- Remove unused `Trash2` icon import.
- Change `DragEndEvent` import to `import type { DragEndEvent }`.

#### [MODIFY] [Courses.tsx](file:///Users/nadaraya/Desktop/СКУЛ/frontend-webapp/src/admin/pages/Courses.tsx)
- Remove unused `isSuperAdmin` variable from `useAuth()` destructuring.

## Verification Plan

### Automated Tests
- Run `npm run build` in `frontend-webapp` to verify `tsc` success.
- Run `python .agent/skills/lint-and-validate/scripts/lint_runner.py .` if available.

### Manual Verification
- Verify that the "Courses" and "Course Editor" pages still load and function correctly in the browser.
