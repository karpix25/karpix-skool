import type { ImgHTMLAttributes } from 'react';

import { toUploadedMediaUrl } from '../lib/uploadedMedia';
import { cn } from '../lib/utils';

interface CourseCoverImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
    src?: string | null;
    fit?: 'contain' | 'cover';
}

export const CourseCoverImage = ({
    src,
    fit = 'contain',
    className,
    ...props
}: CourseCoverImageProps) => {
    const safeSrc = toUploadedMediaUrl(src);
    if (!safeSrc) return null;

    return (
        <img
            src={safeSrc}
            className={cn(
                'h-full w-full',
                fit === 'contain' ? 'object-contain' : 'object-cover',
                className,
            )}
            {...props}
        />
    );
};
