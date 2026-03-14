import { browser } from 'wxt/browser';
import { logger } from '@/components/utils/logger';
import { GetURLParameter } from '@/components/hideThreads/utils';

// -- Types & constants

const READING_PROGRESS_KEY = 'fc_reading_progress';
const SCROLL_TO_KEY = 'fc_scroll_to';
const MAX_PROGRESS_ENTRIES = 50;

export interface ReadingProgressEntry {
  page: number;
  postIndex: number;
  postId: string;
  totalPosts: number;
  postsPerPage: number;
  timestamp: number;
  title?: string;
}

// -- Reading Progress helpers (standalone, bypass FcData)

let rpProgressCache: Record<string, ReadingProgressEntry> | null = null;

export async function saveReadingProgress(threadId: string, entry: ReadingProgressEntry): Promise<void> {
  if (!rpProgressCache) {
    const result = await browser.storage.local.get(READING_PROGRESS_KEY);
    rpProgressCache = (result[READING_PROGRESS_KEY] as Record<string, ReadingProgressEntry>) ?? {};
  }

  // High water mark: only save if new position is more advanced
  const newAbsolute = (entry.page - 1) * entry.postsPerPage + entry.postIndex;
  const existing = rpProgressCache[threadId];
  if (existing) {
    const oldAbsolute = (existing.page - 1) * existing.postsPerPage + existing.postIndex;
    if (newAbsolute <= oldAbsolute) return;
  }

  rpProgressCache[threadId] = entry;

  // Evict oldest if over limit
  const keys = Object.keys(rpProgressCache);
  if (keys.length > MAX_PROGRESS_ENTRIES) {
    const sorted = keys.sort((a, b) => rpProgressCache![a].timestamp - rpProgressCache![b].timestamp);
    for (let i = 0; i < keys.length - MAX_PROGRESS_ENTRIES; i++) {
      delete rpProgressCache[sorted[i]];
    }
  }
  await browser.storage.local.set({ [READING_PROGRESS_KEY]: rpProgressCache });
}

export async function getReadingProgress(threadId: string): Promise<ReadingProgressEntry | null> {
  const result = await browser.storage.local.get(READING_PROGRESS_KEY);
  const progress = (result[READING_PROGRESS_KEY] as Record<string, ReadingProgressEntry>) ?? {};
  return progress[threadId] ?? null;
}

export function extractThreadMetadata(containers: HTMLElement[]): {
  threadId: string | null;
  page: number;
  totalPosts: number;
  postsPerPage: number;
} {
  const url = window.location.href;
  const threadId = GetURLParameter(url, 't') ?? null;
  const page = parseInt(GetURLParameter(url, 'page') ?? '1', 10) || 1;

  let totalPosts = containers.length;
  let postsPerPage = 30;

  // Parse from pagenav title: "Mostrando resultados del 1 al 30 de 231.429"
  const pagenavEl = document.querySelector('.pagenav td.vbmenu_control, .pagenav .popupctrl, [title*="Mostrando resultados"]');
  const titleAttr = pagenavEl?.getAttribute('title') ?? pagenavEl?.textContent ?? '';
  const match = titleAttr.match(/del ([\d.]+) al ([\d.]+) de ([\d.]+)/);
  if (match) {
    const from = parseInt(match[1].replace(/\./g, ''), 10);
    const to = parseInt(match[2].replace(/\./g, ''), 10);
    totalPosts = parseInt(match[3].replace(/\./g, ''), 10);
    postsPerPage = to - from + 1;
  } else {
    // Fallback: check if there's a pagenav to infer posts per page
    const pagenavLinks = document.querySelectorAll('.pagenav a[href*="page="]');
    if (pagenavLinks.length > 0) {
      postsPerPage = containers.length; // current page count
      // Try to get total from last page link
      const lastPageLink = document.querySelector('.pagenav td.alt1 a:last-child[href*="page="]') as HTMLAnchorElement | null;
      if (lastPageLink) {
        const lastPage = parseInt(GetURLParameter(lastPageLink.href, 'page') ?? '1', 10);
        if (lastPage > 1) {
          totalPosts = (lastPage - 1) * postsPerPage + containers.length;
        }
      }
    } else {
      // Single-page thread
      totalPosts = containers.length;
      postsPerPage = containers.length;
    }
  }

  return { threadId, page, totalPosts, postsPerPage };
}

// Module-level state for reading progress
let rpLastVisibleIndex = 0;
let rpSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let rpMeta: ReturnType<typeof extractThreadMetadata> | null = null;
let rpContainers: HTMLElement[] = [];
let rpObserver: IntersectionObserver | null = null;

export function getRpState() {
  return { rpMeta, rpLastVisibleIndex, rpContainers };
}

export function setupReadingProgressObserver(
  containers: HTMLElement[],
  meta: ReturnType<typeof extractThreadMetadata>,
): void {
  // Desconectar observer previo si existe (RERUN_FILTERS)
  if (rpObserver) {
    rpObserver.disconnect();
    rpObserver = null;
  }
  if (rpSaveTimeout) {
    clearTimeout(rpSaveTimeout);
    rpSaveTimeout = null;
  }

  rpContainers = containers;
  rpMeta = meta;
  rpLastVisibleIndex = 0;

  rpObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const idx = rpContainers.indexOf(entry.target as HTMLElement);
          if (idx > rpLastVisibleIndex) {
            rpLastVisibleIndex = idx;
          }
        }
      }
      // Debounced save
      if (rpSaveTimeout) clearTimeout(rpSaveTimeout);
      rpSaveTimeout = setTimeout(() => {
        if (!rpMeta?.threadId) return;
        const container = rpContainers[rpLastVisibleIndex];
        const postMsgEl = container?.querySelector<HTMLElement>('[id^="post_message_"]');
        const postId = postMsgEl?.id ?? container?.id ?? '';
        const threadTitle = document.title?.replace(/\s*-\s*ForoCoches$/i, '').trim() || undefined;
        saveReadingProgress(rpMeta.threadId, {
          page: rpMeta.page,
          postIndex: rpLastVisibleIndex,
          postId,
          totalPosts: rpMeta.totalPosts,
          postsPerPage: rpMeta.postsPerPage,
          timestamp: Date.now(),
          title: threadTitle,
        });
      }, 2000);
    },
    { threshold: 0.5 }
  );

  for (const container of containers) {
    rpObserver.observe(container);
  }

  logger.debug(`readingProgress: observer activo, ${containers.length} posts monitorizados`);
}

export async function handleAutoScroll(): Promise<boolean> {
  const result = await browser.storage.local.get(SCROLL_TO_KEY);
  const scrollTo = result[SCROLL_TO_KEY] as string | undefined;
  if (scrollTo) {
    await browser.storage.local.remove(SCROLL_TO_KEY);
    setTimeout(() => {
      const el = document.getElementById(scrollTo);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        logger.info(`readingProgress: auto-scroll a ${scrollTo}`);
      }
    }, 300);
    return true;
  }
  return false;
}

// Banners ya mostrados/descartados en esta sesión — no volver a mostrar
const dismissedBanners = new Set<string>();

/**
 * Muestra un banner flotante en la página si hay progreso guardado MÁS ADELANTE.
 * Solo se muestra una vez por hilo por sesión.
 */
export async function showResumeReadingBanner(
  meta: ReturnType<typeof extractThreadMetadata>,
): Promise<void> {
  if (!meta.threadId) return;
  if (dismissedBanners.has(meta.threadId)) return;

  const saved = await getReadingProgress(meta.threadId);
  if (!saved) return;

  // Solo mostrar si el progreso guardado está POR DELANTE de la página actual
  const savedAbsolutePost = (saved.page - 1) * saved.postsPerPage + saved.postIndex;
  const currentPageFirstPost = (meta.page - 1) * meta.postsPerPage;
  if (savedAbsolutePost <= currentPageFirstPost) return;
  // Don't show if on the same page
  if (saved.page === meta.page) return;

  dismissedBanners.add(meta.threadId);

  const savedPost = (saved.page - 1) * saved.postsPerPage + saved.postIndex + 1;
  const totalPages = Math.ceil(saved.totalPosts / saved.postsPerPage);

  const banner = document.createElement('div');
  banner.id = 'fc-resume-reading-banner';
  banner.style.cssText = [
    'position:fixed',
    'bottom:20px',
    'right:20px',
    'z-index:99999',
    'background:#1d4ed8',
    'color:#fff',
    'padding:12px 16px',
    'border-radius:10px',
    'box-shadow:0 4px 16px rgba(0,0,0,0.25)',
    'font-family:system-ui,-apple-system,sans-serif',
    'font-size:13px',
    'max-width:320px',
    'display:flex',
    'flex-direction:column',
    'gap:8px',
    'animation:fc-slide-in 0.3s ease-out',
  ].join(';');

  // Inject keyframe animation
  if (!document.getElementById('fc-resume-reading-style')) {
    const style = document.createElement('style');
    style.id = 'fc-resume-reading-style';
    style.textContent = `
      @keyframes fc-slide-in {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const textLine = document.createElement('div');
  textLine.textContent = `Tienes progreso guardado — post ${savedPost.toLocaleString('es-ES')} de ${saved.totalPosts.toLocaleString('es-ES')} (pag. ${saved.page} de ${totalPages.toLocaleString('es-ES')})`;

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;';

  const goBtn = document.createElement('button');
  goBtn.textContent = 'Ir a ultima posicion';
  goBtn.style.cssText = [
    'flex:1',
    'background:#fff',
    'color:#1d4ed8',
    'border:none',
    'padding:6px 12px',
    'border-radius:6px',
    'font-size:12px',
    'font-weight:600',
    'cursor:pointer',
  ].join(';');

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Cerrar';
  dismissBtn.style.cssText = [
    'background:transparent',
    'color:rgba(255,255,255,0.8)',
    'border:1px solid rgba(255,255,255,0.3)',
    'padding:6px 12px',
    'border-radius:6px',
    'font-size:12px',
    'cursor:pointer',
  ].join(';');

  goBtn.addEventListener('click', () => {
    banner.remove();
    // Navigate to saved page with scroll-to flag
    browser.storage.local.set({ [SCROLL_TO_KEY]: saved.postId }).then(() => {
      window.location.href = `https://forocoches.com/foro/showthread.php?t=${meta.threadId}&page=${saved.page}`;
    });
  });

  dismissBtn.addEventListener('click', () => {
    banner.remove();
  });

  btnRow.appendChild(goBtn);
  btnRow.appendChild(dismissBtn);
  banner.appendChild(textLine);
  banner.appendChild(btnRow);
  document.body.appendChild(banner);

  logger.info(`readingProgress: banner mostrado (guardado en pag. ${saved.page}, actual pag. ${meta.page})`);
}
