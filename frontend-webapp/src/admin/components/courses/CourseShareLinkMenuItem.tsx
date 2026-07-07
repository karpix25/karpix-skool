import { ShareLinkMenuItem } from '../share/ShareLinkMenuItem';
import { getCourseShareLink } from '../../../services/deepLinks';

interface CourseShareLinkMenuItemProps {
    courseId: string;
    isPublished: boolean;
}

export const CourseShareLinkMenuItem = ({ courseId, isPublished }: CourseShareLinkMenuItemProps) => {
    return (
        <ShareLinkMenuItem
            getShareLink={() => getCourseShareLink(courseId)}
            idleLabel="Ссылка на курс"
            logLabel="course"
            disabled={!isPublished}
            disabledLabel="Опубликуйте курс"
        />
    );
};
