export const consumeDesktopAuthToken = (search: string) => {
    const params = new URLSearchParams(search);
    const token = params.get('token');

    if (!params.has('token')) {
        return {
            token: null,
            shouldReplace: false,
            search,
        };
    }

    params.delete('token');

    const nextSearch = params.toString();

    return {
        token,
        shouldReplace: true,
        search: nextSearch ? `?${nextSearch}` : '',
    };
};
