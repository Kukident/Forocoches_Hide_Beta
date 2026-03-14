/**
 * Colapsa el post con un spoiler clickeable.
 */
export function wrapWithSpoiler(container: HTMLElement, username: string, theme: 'old' | 'new'): void {
  if (container.dataset.fcIgnored) return;
  container.dataset.fcIgnored = 'spoiler';

  let bodyEl: HTMLElement | null = null;
  if (theme === 'old') {
    bodyEl = container.querySelector<HTMLElement>('[id^="post_message_"]') || container.querySelector<HTMLElement>('td.alt1') || container.querySelector<HTMLElement>('td.post') || container.querySelector<HTMLElement>('td[align]');
  } else {
    bodyEl = container.querySelector<HTMLElement>('[id^="post_message_"]') || container.querySelector<HTMLElement>('.post_message');
  }

  const target = bodyEl ?? container;
  const originalDisplay = (target as HTMLElement).style.display || '';

  const bar = document.createElement('div');
  bar.className = 'fc-ignored-bar';
  bar.style.cssText = [
    'padding:6px 10px',
    'background:#f0f0f0',
    'border:1px solid #ccc',
    'border-radius:4px',
    'cursor:pointer',
    'font-size:0.85em',
    'color:#555',
    'margin:4px 0',
    'user-select:none',
  ].join(';');
  bar.textContent = `Post de ${username} (oculto) — haz clic para ver`;

  target.style.display = 'none';
  target.parentElement?.insertBefore(bar, target);

  bar.addEventListener('click', () => {
    if (target.style.display === 'none') {
      target.style.display = originalDisplay;
      bar.textContent = `Post de ${username} (visible) — haz clic para ocultar`;
    } else {
      target.style.display = 'none';
      bar.textContent = `Post de ${username} (oculto) — haz clic para ver`;
    }
  });
}

/**
 * Oculta el post entero, dejando solo un indicador mínimo clicable.
 * En el nuevo tema oculta la <section> padre y coloca la barra al mismo nivel,
 * para que <separator-large> siga dando el espaciado entre posts.
 */
export function hidePostFully(container: HTMLElement, username: string, theme: 'old' | 'new'): void {
  if (container.dataset.fcIgnored) return;
  container.dataset.fcIgnored = 'fullhide';

  // En el nuevo tema, la estructura es: #edit > section > .postbit_wrapper
  // Ocultamos la section entera y colocamos la barra como hermana.
  const hideTarget = (theme === 'new' && container.parentElement?.tagName === 'SECTION')
    ? container.parentElement
    : container;

  const originalDisplay = hideTarget.style.display || '';
  hideTarget.style.display = 'none';

  const bar = document.createElement('div');
  bar.className = 'fc-fullhide-bar';
  bar.style.cssText = [
    'padding:4px 10px',
    'border:1px dashed #bbb',
    'border-radius:4px',
    'cursor:pointer',
    'font-size:0.8em',
    'color:#999',
    'margin:4px 0',
    'user-select:none',
  ].join(';');
  bar.textContent = `Post oculto (${username})`;

  hideTarget.parentElement?.insertBefore(bar, hideTarget);

  bar.addEventListener('click', () => {
    if (hideTarget.style.display === 'none') {
      hideTarget.style.display = originalDisplay;
      bar.textContent = `Post visible (${username}) — clic para ocultar`;
    } else {
      hideTarget.style.display = 'none';
      bar.textContent = `Post oculto (${username})`;
    }
  });
}

/**
 * Inyecta la nota de usuario junto al nombre del autor en un post.
 */
export function injectNoteInPost(authorEl: HTMLElement, note: string): void {
  if (authorEl.parentElement?.querySelector('.fc-user-note-post')) return;
  const span = document.createElement('span');
  span.className = 'fc-user-note-post';
  span.textContent = ` — ${note}`;
  span.title = note;
  span.style.cssText = 'font-size:0.78em;color:#b07800;margin-left:4px;cursor:help;display:block;';
  authorEl.insertAdjacentElement('afterend', span);
}

/**
 * Colorear post según modo (background completo o borde izquierdo).
 */
export function highlightPostContainer(
  container: HTMLElement,
  color: string,
  theme: 'old' | 'new',
  mode: 'background' | 'border',
): void {
  if (mode === 'border') {
    if (theme === 'old') {
      // tborder-author/tborder-user tienen border 3px nativo; tborder tiene 0px.
      // Añadir la clase nativa si falta y luego sobreescribir el color.
      if (!container.classList.contains('tborder-author') && !container.classList.contains('tborder-user')) {
        container.dataset.fcOriginalClass = container.className;
        container.classList.replace('tborder', 'tborder-author');
      }
      container.style.borderLeftColor = color;
      container.style.borderRightColor = color;
    } else {
      // Tema nuevo: la <section> padre es donde FC pone su borde nativo
      const section = container.parentElement?.tagName === 'SECTION'
        ? container.parentElement
        : container;
      section.style.borderLeft = `4px solid ${color}`;
    }
  } else {
    // Modo background
    if (theme === 'old') {
      const cells = container.querySelectorAll<HTMLElement>('td');
      for (const cell of cells) {
        cell.style.backgroundColor = color;
      }
    } else {
      // Colorear la <section> padre (envuelve toda la card) o el container como fallback
      const target = container.parentElement?.tagName === 'SECTION'
        ? container.parentElement
        : container;
      target.style.backgroundColor = color;
    }
  }
}

/**
 * Limpiar decoraciones previas (para RERUN_FILTERS).
 */
export function cleanPostDecorations(): void {
  document.querySelectorAll('.fc-ignored-bar').forEach(el => el.remove());
  document.querySelectorAll('.fc-fullhide-bar').forEach(el => el.remove());
  document.querySelectorAll('[data-fc-ignored]').forEach(el => {
    const htmlEl = el as HTMLElement;
    const mode = htmlEl.dataset.fcIgnored;
    delete htmlEl.dataset.fcIgnored;
    if (mode === 'fullhide') {
      // Restaurar la section padre si fue ella la ocultada (nuevo tema)
      const parent = htmlEl.parentElement;
      if (parent?.tagName === 'SECTION' && parent.style.display === 'none') {
        parent.style.display = '';
      } else {
        htmlEl.style.display = '';
      }
    } else {
      const bodyEl = htmlEl.querySelector<HTMLElement>('[id^="post_message_"]');
      if (bodyEl) bodyEl.style.display = '';
    }
  });
  document.querySelectorAll('.fc-user-note-post').forEach(el => el.remove());
  // Limpiar backgrounds y bordes de OP/VIP
  document.querySelectorAll<HTMLElement>('.postbit_wrapper, table[id^="post"]').forEach(el => {
    el.style.backgroundColor = '';
    el.style.borderLeftColor = '';
    el.style.borderRightColor = '';
    // Tema viejo: restaurar clase original y limpiar <td> internas (modo background)
    if (el.tagName === 'TABLE') {
      if (el.dataset.fcOriginalClass) {
        el.className = el.dataset.fcOriginalClass;
        delete el.dataset.fcOriginalClass;
      }
      el.querySelectorAll<HTMLElement>('td').forEach(td => {
        td.style.backgroundColor = '';
      });
    }
    // Tema nuevo: limpiar la <section> padre (borde y fondo)
    if (el.classList.contains('postbit_wrapper') && el.parentElement?.tagName === 'SECTION') {
      el.parentElement.style.borderLeft = '';
      el.parentElement.style.backgroundColor = '';
    }
  });
}
