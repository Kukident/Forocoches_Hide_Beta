export function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
}

/**
 * Extrae los usernames del HTML de la página `profile.php?do=ignorelist` de FC (vBulletin 3.8).
 * - Devuelve `null` si no se encuentra el bloque `<ul id="ignorelist">` (p. ej. página de login).
 * - Devuelve `[]` si la lista está pero vacía.
 */
export function parseIgnorelist(html: string): string[] | null {
    const listMatch = html.match(/<ul[^>]*id=["']ignorelist["'][^>]*>([\s\S]*?)<\/ul>/i);
    if (!listMatch) return null;
    const listHtml = listMatch[1];

    const userRegex = /<a[^>]*href=["'][^"']*member\.php\?u=\d+["'][^>]*>\s*([^<]+?)\s*<\/a>/gi;
    const users: string[] = [];
    let m;
    while ((m = userRegex.exec(listHtml)) !== null) {
        const name = decodeHtmlEntities(m[1].trim());
        if (name) users.push(name);
    }
    return users;
}
