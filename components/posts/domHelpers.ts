/**
 * Devuelve todos los contenedores de post de la pagina segun el tema activo.
 */
export function getPostContainers(theme: 'old' | 'new'): HTMLElement[] {
  if (theme === 'old') {
    return Array.from(document.querySelectorAll<HTMLElement>('table[id^="post"]')).filter(el => !!el.querySelector('.bigusername'));
  } else {
    const wrappers = Array.from(document.querySelectorAll<HTMLElement>('.postbit_wrapper'));
    if (wrappers.length > 0) return wrappers;

    const msgs = Array.from(document.querySelectorAll<HTMLElement>('[id^="post_message_"]'));
    const mapped = msgs
      .map(m => m.closest<HTMLElement>('.postbit_wrapper') ?? m.parentElement)
      .filter((v): v is HTMLElement => !!v);
    return Array.from(new Set(mapped));
  }
}

/**
 * Extrae el nombre de usuario de un contenedor de post (casing original).
 */
export function getPostAuthor(container: HTMLElement, theme: 'old' | 'new'): string {
  const selectors = ['.bigusername', '[id^="postmenu_"] a', 'a.username', 'a[rel="author"]', '.post_author a'];
  for (const sel of selectors) {
    const el = container.querySelector<HTMLElement>(sel);
    if (el && el.textContent) {
      let text = el.textContent.trim();
      if (theme === 'new') {
        text = text.replace(/^@/, '').split(/\s+-\s+/)[0];
      }
      return text;
    }
  }
  return '';
}

/**
 * Devuelve el elemento donde esta el nombre del autor (para inyectar notas).
 */
export function getAuthorElement(container: HTMLElement, theme: 'old' | 'new'): HTMLElement | null {
  if (theme === 'old') {
    return container.querySelector<HTMLElement>('.bigusername');
  } else {
    return container.querySelector<HTMLElement>('[id^="postmenu_"] a');
  }
}

/**
 * Detectar si estamos en pagina 1.
 */
export function isFirstPage(): boolean {
  const params = new URL(window.location.href).searchParams;
  const page = params.get('page');
  return !page || page === '1';
}

/**
 * Extrae el nombre del OP del JSON-LD (DiscussionForumPosting) presente en todas las páginas.
 */
export function getThreadOP(): string | null {
  const script = document.querySelector('script[type="application/ld+json"]');
  if (!script?.textContent) return null;
  try {
    const data = JSON.parse(script.textContent);
    if (data?.['@type'] === 'DiscussionForumPosting' && data?.author?.name) {
      return data.author.name;
    }
  } catch { /* ignore malformed JSON-LD */ }
  return null;
}
