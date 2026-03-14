export function GetURLParameter(url: string, sParam: string): string | undefined {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.searchParams.get(sParam) ?? undefined;
    } catch {
        return undefined;
    }
}

export function escapeRegExp(text: string): string {
    return text.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&');
}
