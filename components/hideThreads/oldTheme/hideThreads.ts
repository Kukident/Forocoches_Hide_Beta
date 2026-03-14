import { logger } from '@/components/utils/logger';
import type { FcFeatureConfig, FcUserEntry } from '@/components/hideThreads/storageUtils';
import { injectFilterCause, injectUserNote, cleanPreviousDecorations, updateHiddenBadge } from '@/components/hideThreads/shared';

/** Aplica backgroundColor a todos los <td> de una fila (los <td> tienen background propio vía CSS). */
function setRowBg(tr: HTMLElement, color: string) {
    tr.querySelectorAll('td').forEach(td => { (td as HTMLElement).style.backgroundColor = color; });
}

function clearRowBg(tr: HTMLElement) {
    tr.querySelectorAll('td').forEach(td => { (td as HTMLElement).style.backgroundColor = ''; });
}

/**
 * Extrae el numero de respuestas de una fila de hilo (tema viejo).
 * Usa el atributo title de la ultima columna: "Respuestas: X, Visitas: Y"
 * o el texto del <strong> dentro del ultimo <td>.
 */
function getRepliesOldTheme(trElement: HTMLElement): number {
    const tds = trElement.querySelectorAll('td');
    if (tds.length >= 4) {
        const titleAttr = tds[tds.length - 2]?.getAttribute('title') ?? '';
        const match = titleAttr.match(/Respuestas:\s*([\d.]+)/i);
        if (match) {
            return parseInt(match[1].replace(/\./g, ''), 10) || 0;
        }
    }
    const strong = trElement.querySelector('td:last-child a strong');
    if (strong) {
        return parseInt((strong.textContent ?? '').replace(/\./g, ''), 10) || 0;
    }
    return -1;
}

export function hideOldThemeThreads(
    ocultar: boolean,
    expreg: RegExp,
    expreg_users: RegExp,
    features: FcFeatureConfig,
    highlightExpreg: RegExp,
    highlightExpregUsers: RegExp,
    users: Record<string, FcUserEntry>,
): number {
    // Restaurar hilos previamente ocultos antes de re-filtrar
    const collapseObj = document.getElementById("collapseobj_st_3");
    if (collapseObj) {
        const threadsList = document.getElementById('threadslist');
        const hiddenRows = Array.from(collapseObj.querySelectorAll('tr'));
        for (const row of hiddenRows) {
            (row as HTMLElement).style.opacity = '';
            clearRowBg(row as HTMLElement);
            threadsList?.appendChild(row);
        }
        collapseObj.innerHTML = '';
    }

    // Limpiar decoraciones previas
    cleanPreviousDecorations();
    const contador = document.getElementById("contador_hilos");
    if (contador) contador.textContent = '';

    const threadTitles = document.querySelectorAll("[id^=thread_title_]");
    let hilos_ocultados = 0;

    threadTitles.forEach(threadTitle => {
        const texto = (threadTitle.textContent || '').trim().toLowerCase();
        const authorContainer = threadTitle.parentElement?.nextElementSibling;
        const user = (authorContainer?.textContent || '').trim().toLowerCase();
        const trElement = threadTitle.closest("tr") as HTMLElement | null;
        if (!trElement) return;
        clearRowBg(trElement);

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
                if (ocultar) {
                    trElement.style.opacity = '0.2';
                    collapseObj?.appendChild(trElement);
                }
                hilos_ocultados++;

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
                setRowBg(trElement, features.highlightThreadsColor);
                if (features.filterIndicatorHighlight) {
                    const cause = hwMatch?.[0]?.trim() ?? huMatch?.[0]?.trim() ?? '';
                    if (cause) injectFilterCause(threadTitle, cause);
                }
            }
        }

        // -- Identificar poles (0 respuestas)
        if (features.highlightPoles) {
            const replies = getRepliesOldTheme(trElement);
            if (replies === 0) {
                setRowBg(trElement, features.highlightPolesColor);
            }
        }

        // -- Resaltar VIP (per-user)
        if (features.highlightVIP && userEntry?.highlightThread) {
            setRowBg(trElement, userEntry.threadColor ?? features.highlightVIPThreadColor);
        }

        // -- Notas de usuario
        if (features.userNotes && authorContainer && userEntry?.note) {
            injectUserNote(authorContainer, userEntry.note);
        }
    });

    if (collapseObj) {
        const newTr = document.createElement('tr');
        newTr.innerHTML = '<td class="thead" colspan="6">&nbsp;</td>';
        collapseObj.appendChild(newTr);
    }

    if (contador) {
        contador.textContent = hilos_ocultados > 0 ? `(${hilos_ocultados})` : '';
    }

    updateHiddenBadge(hilos_ocultados);

    logger.debug(`oldTheme: ${hilos_ocultados} hilos ocultados de ${threadTitles.length}`);
    return hilos_ocultados;
}
