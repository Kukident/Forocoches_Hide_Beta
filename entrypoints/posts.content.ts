import { browser } from 'wxt/browser';
import { logger } from '@/components/utils/logger';
import { getForumStyle } from '@/components/utils/forumStyle';
import { readLocalData, getFeatureConfig, getActiveGroupFilters } from '@/components/hideThreads/storageUtils';
import { getPostContainers, getThreadOP } from '@/components/posts/domHelpers';
import { cleanPostDecorations } from '@/components/posts/postDecorations';
import { applyPostFeatures } from '@/components/posts/postFeatures';
import { embedVideos } from '@/components/posts/videoEmbed';
import {
  extractThreadMetadata, setupReadingProgressObserver,
  handleAutoScroll, showResumeReadingBanner,
  getReadingProgress, getRpState,
  type ReadingProgressEntry,
} from '@/components/posts/readingProgress';

// -- Extraer info del hilo para el popup

function extractThreadInfo(theme: 'old' | 'new'): {
  forumId: string | null;
  forumName: string | null;
  opUsername: string | null;
  threadTitle: string | null;
} {
  let forumId: string | null = null;
  let forumName: string | null = null;
  const link = document.querySelector<HTMLAnchorElement>('a[href*="forumdisplay.php?f="]');
  if (link) {
    const match = link.href.match(/forumdisplay\.php\?f=(\d+)/);
    if (match) forumId = match[1];
    forumName = link.textContent?.trim() ?? null;
  }

  const opUsername = getThreadOP() ?? null;

  const titleText = document.title?.replace(/\s*-\s*ForoCoches$/i, '').trim() ?? null;

  return { forumId, forumName, opUsername, threadTitle: titleText };
}

// -- Main

async function loadAndApplyFeatures(theme: 'old' | 'new', preloaded?: Awaited<ReturnType<typeof readLocalData>> | null): Promise<void> {
  let data;
  if (preloaded) {
    data = preloaded;
  } else {
    try {
      data = await readLocalData();
    } catch (err) {
      logger.error('posts.content: error leyendo storage:', err);
      return;
    }
  }

  const features = getFeatureConfig(data);

  if (!features.ignoreUsersInPosts && !features.highlightOP &&
      !features.highlightVIPPosts && !features.userNotes) {
    return;
  }

  const containers = getPostContainers(theme);
  if (containers.length === 0) {
    logger.debug('posts.content: no se encontraron contenedores de post');
    return;
  }

  const opUsername = getThreadOP()?.toLowerCase() ?? null;
  logger.debug(`posts.content: tema=${theme}, OP=${opUsername ?? '(pag>1)'}, posts=${containers.length}`);

  // Banusers: todos los foros (incluye f["*"] global) + grupos activos
  const banusersSet = new Set<string>();
  for (const f of Object.values(data.f)) {
    if (f.u) for (const u of f.u) banusersSet.add(u);
  }
  const { banusers: gu } = getActiveGroupFilters(data);
  for (const u of gu) banusersSet.add(u);
  const banusers = [...banusersSet];

  const users = data.users ?? {};

  applyPostFeatures(containers, theme, opUsername, banusers, users, features);

  logger.info(`posts.content: funcionalidades aplicadas a ${containers.length} posts`);
}

export default defineContentScript({
  matches: [
    '*://forocoches.com/foro/showthread.php*',
  ],
  runAt: 'document_end',
  async main() {
    logger.debug('posts.content activo');

    // Lanzar lectura de storage inmediatamente
    const dataPromise = readLocalData().catch(err => {
      logger.error('posts.content: error leyendo storage:', err);
      return null;
    });

    const theme = getForumStyle() as 'old' | 'new';

    // -- Features de post (prioridad: lo que el usuario ve primero)
    const preloadedData = await dataPromise;
    if (preloadedData) {
      await loadAndApplyFeatures(theme, preloadedData);
    }

    // -- WebM embeds (después de features, no bloquea lo visible)
    if (preloadedData) {
      const features = getFeatureConfig(preloadedData);
      if (features.embedWebm) {
        embedVideos();
      }
    }

    // -- Reading progress (desactivado temporalmente)
    if (preloadedData) {
      const rpFeatures = getFeatureConfig(preloadedData);
      if (false && rpFeatures.readingProgress) {
        const postContainersForRp = getPostContainers(theme);
        if (postContainersForRp.length > 0) {
          const meta = extractThreadMetadata(postContainersForRp);
          if (meta.threadId) {
            setupReadingProgressObserver(postContainersForRp, meta);
            const didAutoScroll = await handleAutoScroll();
            if (!didAutoScroll) {
              await showResumeReadingBanner(meta);
            }
          }
        }
      }
    }

    // -- Escuchar mensajes del popup y otras partes de la extensión
    browser.runtime.onMessage.addListener((msg: any) => {
      if (msg.type === 'GET_THREAD_INFO') {
        return Promise.resolve(extractThreadInfo(theme));
      }
      if (msg.type === 'RERUN_FILTERS') {
        logger.debug('posts.content: reaplicando features');
        cleanPostDecorations();
        loadAndApplyFeatures(theme);
      }
      if (msg.type === 'GET_READING_PROGRESS') {
        const { rpMeta, rpLastVisibleIndex } = getRpState();
        if (!rpMeta?.threadId) return Promise.resolve(null);
        return (async () => {
          const rawSaved = await getReadingProgress(rpMeta!.threadId!);
          const currentPost = (rpMeta!.page - 1) * rpMeta!.postsPerPage + rpLastVisibleIndex + 1;
          const totalPages = Math.ceil(rpMeta!.totalPosts / rpMeta!.postsPerPage);

          // Solo devolver savedEntry si está por delante de la página actual
          let savedEntry: ReadingProgressEntry | null = null;
          if (rawSaved) {
            const savedAbsolute = (rawSaved.page - 1) * rawSaved.postsPerPage + rawSaved.postIndex;
            const currentPageFirst = (rpMeta!.page - 1) * rpMeta!.postsPerPage;
            if (savedAbsolute > currentPageFirst && rawSaved.page !== rpMeta!.page) {
              savedEntry = rawSaved;
            }
          }

          return {
            currentPost,
            totalPosts: rpMeta!.totalPosts,
            page: rpMeta!.page,
            totalPages,
            savedEntry,
          };
        })();
      }
      if (msg.type === 'SCROLL_TO_POST') {
        const { rpMeta } = getRpState();
        const { postId, page } = msg;
        if (page === rpMeta?.page) {
          const el = document.getElementById(postId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return Promise.resolve({ scrolled: true });
          }
        }
        // Different page — popup will handle redirect
        const threadId = rpMeta?.threadId;
        if (threadId) {
          return Promise.resolve({
            redirect: true,
            url: `https://forocoches.com/foro/showthread.php?t=${threadId}&page=${page}`,
          });
        }
        return Promise.resolve(null);
      }
    });
  },
});
