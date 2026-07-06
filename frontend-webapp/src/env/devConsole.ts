const isDevRuntime = () => import.meta.env.DEV;

export const devLog = (...args: unknown[]) => {
    if (isDevRuntime()) {
        console.log(...args);
    }
};

export const devWarn = (...args: unknown[]) => {
    if (isDevRuntime()) {
        console.warn(...args);
    }
};

export const devError = (...args: unknown[]) => {
    if (isDevRuntime()) {
        console.error(...args);
    }
};
