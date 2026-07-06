import type { DeepLinkResolveResponse } from '../../../services/deepLinks';


export const getLessonLeadTitle = (offer: DeepLinkResolveResponse | null) => {
    const title = offer?.lesson_title?.trim();
    return title ? `Откройте урок «${title}»` : 'Откройте бесплатный урок';
};


export const getLessonLeadDescription = (
    offer: DeepLinkResolveResponse | null,
    tenantName?: string | null,
) => {
    const courseTitle = offer?.course_title?.trim();
    const schoolName = offer?.tenant_name?.trim() || tenantName?.trim();

    if (courseTitle && schoolName) {
        return `Материал из курса «${courseTitle}» доступен участникам Telegram-группы школы «${schoolName}».`;
    }
    if (schoolName) {
        return `Материал доступен участникам Telegram-группы школы «${schoolName}».`;
    }
    return 'Материал доступен участникам бесплатной Telegram-группы.';
};
