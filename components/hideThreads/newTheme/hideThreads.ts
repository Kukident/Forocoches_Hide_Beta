import { logger } from '@/components/utils/logger';
import type { FcFeatureConfig, FcUserEntry } from '@/components/hideThreads/storageUtils';
import { injectFilterCause, injectUserNote, cleanPreviousDecorations, updateHiddenBadge } from '@/components/hideThreads/shared';

/**
 * Extrae el username del autor de un hilo en el tema nuevo.
 * Busca el patrón "@username - fecha" dentro del contenedor del hilo.
 * Fallback: parentElement.nextElementSibling del título.
 */
function extractNewThemeUser(threadElement: HTMLElement, threadTitle: Element): string {
    // Buscar todos los spans/textos con patrón @user dentro del contenedor
    const spans = threadElement.querySelectorAll('span');
    for (const span of spans) {
        // Solo nodos con texto directo (no hijos anidados con thread_title)
        if (span.querySelector('[id^=thread_title_]')) continue;
        const text = (span.textContent || '').trim();
        const match = text.match(/^@(\S+)\s+-\s+/);
        if (match) return match[1].toLowerCase();
    }

    // Fallback: navegación relativa al título
    const metaRow = threadTitle.parentElement?.nextElementSibling;
    const rawUser = (metaRow?.textContent || '').trim();
    const user = rawUser.replace(/^@/, '').split(/\s+-\s+/)[0].trim().toLowerCase();
    if (!user) {
        logger.warn('newTheme: no se pudo extraer username del hilo', threadTitle.textContent);
    }
    return user;
}

/**
 * Extrae el numero de respuestas de un elemento de hilo (tema nuevo).
 * Usa el enlace a misc.php?do=whoposted cuyo texto es el numero de replies.
 */
function getRepliesNewTheme(threadElement: HTMLElement): number {
    const link = threadElement.querySelector('a[href*="whoposted"]');
    if (link) {
        return parseInt((link.textContent ?? '').replace(/\./g, '').trim(), 10) || 0;
    }
    return -1;
}

export function hideNewThemeThreads(
    ocultar: boolean,
    expreg: RegExp,
    expreg_users: RegExp,
    features: FcFeatureConfig,
    highlightExpreg: RegExp,
    highlightExpregUsers: RegExp,
    users: Record<string, FcUserEntry>,
): number {
    // Restaurar hilos previamente ocultos antes de re-filtrar
    const hiddenSection = document.getElementById("hilos_ocultos");
    if (hiddenSection) {
        const sortingMenu = document.getElementById("sorting_menu");
        const parent = sortingMenu?.parentElement;
        if (parent) {
            const hiddenEls = Array.from(hiddenSection.children);
            for (const el of hiddenEls) {
                (el as HTMLElement).style.opacity = '';
                (el as HTMLElement).style.backgroundColor = '';
                parent.appendChild(el);
            }
        }
        hiddenSection.innerHTML = '';
    }

    // Limpiar decoraciones previas
    cleanPreviousDecorations();
    const contador = document.getElementById("contador_hilos");
    if (contador) contador.textContent = '';

    const threadTitles = document.querySelectorAll("[id^=thread_title_]");
    let hilos_ocultados = 0;

    threadTitles.forEach(threadTitle => {
        const texto = (threadTitle.textContent || '').trim().toLowerCase();

        const threadElement = threadTitle.closest("div")?.parentElement?.parentElement as HTMLElement | null;
        if (!threadElement) return;
        threadElement.style.backgroundColor = '';
        const threadElementSeparator = threadElement.nextElementSibling;

        // Extraer username: buscar texto con patrón "@user - fecha" dentro del contenedor
        const user = extractNewThemeUser(threadElement, threadTitle);
        const metaRow = threadTitle.parentElement?.nextElementSibling;

        const userEntry = users[user];

        // -- Ocultar hilo
        const wordMatch = texto.match(expreg);
        const userMatch = user.match(expreg_users);
        if (wordMatch !== null || userMatch !== null) {
            // Protección VIP: no ocultar hilos de usuarios con highlight
            if (features.protectVIP && userEntry &&
                (userEntry.highlightThread || userEntry.highlightPost)) {
                // Skip ocultamiento, pero continuar con decoraciones
            } else {
                hilos_ocultados++;
                if (ocultar) {
                    threadElement.style.opacity = '0.2';
                    hiddenSection?.appendChild(threadElement);
                    if (threadElementSeparator) {
                        hiddenSection?.appendChild(threadElementSeparator);
                    }
                }

                if (features.filterIndicatorHide) {
                    const cause = wordMatch?.[0]?.trim() ?? userMatch?.[0]?.trim() ?? '';
                    if (cause) injectFilterCause(threadTitle, cause);
                }
                return;
            }
        }

        // -- Resaltar hilo (listas hw/hu)
        // Prioridad de colores (último gana): highlight words/users → poles → VIP
        if (features.highlightThreads) {
            const hwMatch = texto.match(highlightExpreg);
            const huMatch = user.match(highlightExpregUsers);
            if (hwMatch !== null || huMatch !== null) {
                threadElement.style.backgroundColor = features.highlightThreadsColor;
                if (features.filterIndicatorHighlight) {
                    const cause = hwMatch?.[0]?.trim() ?? huMatch?.[0]?.trim() ?? '';
                    if (cause) injectFilterCause(threadTitle, cause);
                }
            }
        }

        // -- Identificar poles (0 respuestas)
        if (features.highlightPoles) {
            const replies = getRepliesNewTheme(threadElement);
            if (replies === 0) {
                threadElement.style.backgroundColor = features.highlightPolesColor;
            }
        }

        // -- Resaltar VIP (per-user)
        if (features.highlightVIP && userEntry?.highlightThread) {
            threadElement.style.backgroundColor = userEntry.threadColor ?? features.highlightVIPThreadColor;
        }

        // -- Notas de usuario
        if (features.userNotes && metaRow && userEntry?.note) {
            injectUserNote(metaRow, userEntry.note);
        }
    });

    const collapseObj = document.getElementById("collapseobj_st_3");
    if (collapseObj) {
        const newTr = document.createElement('tr');
        newTr.innerHTML = '<td class="thead" colspan="6">&nbsp;</td>';
        collapseObj.appendChild(newTr);
    }

    if (contador) {
        contador.textContent = hilos_ocultados > 0 ? `(${hilos_ocultados})` : '';
    }

    updateHiddenBadge(hilos_ocultados);

    logger.debug(`newTheme: ${hilos_ocultados} hilos ocultados de ${threadTitles.length}`);
    return hilos_ocultados;
}
