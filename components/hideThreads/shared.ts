/**
 * Funciones DOM compartidas entre oldTheme y newTheme hideThreads.
 */

/**
 * Inyecta el indicador de causa junto al titulo del hilo.
 * Solo se inyecta una vez por hilo (evita duplicados al re-ejecutar).
 */
export function injectFilterCause(titleEl: Element, cause: string): void {
    if (titleEl.parentElement?.querySelector('.fc-filter-cause')) return;
    const span = document.createElement('span');
    span.className = 'fc-filter-cause';
    span.textContent = ` [${cause}]`;
    span.style.cssText = 'font-size:0.75em;color:#888;margin-left:4px;font-style:italic;';
    titleEl.insertAdjacentElement('afterend', span);
}

/**
 * Inyecta la nota de usuario junto al nombre del autor en el hilo.
 * Solo se inyecta una vez por hilo.
 */
export function injectUserNote(authorEl: Element, note: string): void {
    if (authorEl.querySelector('.fc-user-note')) return;
    const span = document.createElement('span');
    span.className = 'fc-user-note';
    span.textContent = ` — ${note}`;
    span.title = note;
    span.style.cssText = 'font-size:0.75em;color:#b07800;margin-left:4px;cursor:help;';
    authorEl.appendChild(span);
}

/** Limpia indicadores y decoraciones previas antes de re-filtrar. */
export function cleanPreviousDecorations(): void {
    document.querySelectorAll('.fc-filter-cause').forEach(el => el.remove());
    document.querySelectorAll('.fc-user-note').forEach(el => el.remove());
}

/** Actualiza el badge con el contador de hilos ocultos. */
export function updateHiddenBadge(hilosOcultados: number): void {
    const cmega2 = document.querySelector('.cmega2');
    if (!cmega2) return;
    let badge = document.getElementById('fc-hidden-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'fc-hidden-badge';
        badge.className = 'smallfont';
        cmega2.insertAdjacentElement('beforeend', document.createElement('br'));
        cmega2.insertAdjacentElement('beforeend', badge);
    }
    badge.textContent = `Se han ocultado ${hilosOcultados} hilos`;
}
