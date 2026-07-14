import type { CSSProperties } from 'react';

const SAFE_HEX_COLOR = /^#[0-9A-F]{6}$/i;

export const getStudentBrandStyle = (accentColor?: string | null): CSSProperties => {
    if (!accentColor || !SAFE_HEX_COLOR.test(accentColor)) return {};

    return {
        '--color-primary': accentColor,
        '--color-ring': accentColor,
        '--tg-theme-link-color': accentColor,
        '--tg-theme-button-color': accentColor,
    } as CSSProperties;
};
