import type { NavigateFunction } from 'react-router-dom';

interface StartStudentPreviewOptions {
    path: string;
    navigate: NavigateFunction;
    confirmPreview: () => Promise<boolean>;
}

export const startStudentPreview = async ({
    path,
    navigate,
    confirmPreview,
}: StartStudentPreviewOptions) => {
    try {
        navigate(path);
    } catch (navigationError) {
        console.error('Failed to start student preview navigation:', navigationError);
        return false;
    }

    return confirmPreview();
};
