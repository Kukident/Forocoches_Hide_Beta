import { browser } from 'wxt/browser';
import { getForumStyle } from '@/components/utils/forumStyle';
import { logger } from '@/components/utils/logger';
import { manageOldThemeHtml } from "@/components/hideThreads/oldTheme/injectPostListElements";
import { manageNewThemeHtml } from "@/components/hideThreads/newTheme/injectPostListElements";
import { hideOldThemeThreads } from "@/components/hideThreads/oldTheme/hideThreads";
import { hideNewThemeThreads } from "@/components/hideThreads/newTheme/hideThreads";
import {
  escapeRegExp,
  getActiveGroupFilters,
  getFeatureConfig,
  getFilters,
  getHighlightFilters,
  GetURLParameter,
  readLocalData,
  DEFAULT_FEATURE_CONFIG,
} from "@/components/hideThreads/storageUtils";

/** Expresión regular que no casa con nada (usada cuando la lista está vacía). */
const NO_MATCH_REGEX = /(?!)/;

// Boundary: whitespace o puntuación común (para casar "covid" en "covid.", "(covid)", etc.)
const B_LEFT  = '(?:[\\s.,;:!?([\\]{}<>]|^)';
const B_RIGHT = '(?=[\\s.,;:!?)\\]}{>]|$)';

function buildRegex(terms: string[]): RegExp {
  if (terms.length === 0) return NO_MATCH_REGEX;
  const escaped = terms.map(escapeRegExp);
  return new RegExp(B_LEFT + "(" + escaped.join(")" + B_RIGHT + "|" + B_LEFT + "(") + ")" + B_RIGHT, "i");
}

async function loadFiltersAndHide(forumStyle: string, id_foro: string, preloaded?: Awaited<ReturnType<typeof readLocalData>> | null): Promise<void> {
  let data;
  if (preloaded) {
    data = preloaded;
  } else {
    try {
      data = await readLocalData();
    } catch (err) {
      logger.error('error leyendo storage:', err);
      return;
    }
  }

  const ocultar = data.s.active;

  if (!ocultar) {
    logger.debug('Extensión desactivada, omitiendo filtros');
    browser.runtime.sendMessage({ type: 'SET_BADGE', count: 0, off: true })
      .catch((err) => logger.error('SET_BADGE sendMessage:', err));
    return;
  }

  const { banwords, banusers } = getFilters(data, id_foro);
  const { banwords: gw, banusers: gu, highlightwords: ghw, highlightusers: ghu } = getActiveGroupFilters(data);
  const ignoredUsers = data.ignored ?? [];
  const allWords = [...banwords, ...gw];
  const allUsers = [...banusers, ...gu, ...ignoredUsers];

  const features = getFeatureConfig(data);
  const { highlightwords: forumHW, highlightusers: forumHU } = getHighlightFilters(data, id_foro);
  const highlightWords = [...forumHW, ...ghw];
  const highlightUsers = [...forumHU, ...ghu];
  const users = data.users ?? {};

  logger.info(`Foro ${id_foro}: ${banwords.length} palabras, ${banusers.length} usuarios, ${gw.length + gu.length} de grupos`);

  const expreg       = buildRegex(allWords);
  const expregUsers  = buildRegex(allUsers);
  const hlExpreg     = buildRegex(highlightWords);
  const hlExpregUsers = buildRegex(highlightUsers);

  const shouldHide = features.hideThreads && (allWords.length > 0 || allUsers.length > 0);
  let nOcultos = 0;
  if (shouldHide || features.highlightThreads || features.highlightPoles ||
      features.highlightVIP || features.userNotes) {
    nOcultos = forumStyle === 'old'
      ? hideOldThemeThreads(shouldHide, expreg, expregUsers, features, hlExpreg, hlExpregUsers, users)
      : hideNewThemeThreads(shouldHide, expreg, expregUsers, features, hlExpreg, hlExpregUsers, users);
    logger.info(`${nOcultos} hilos ocultados`);
  }

  browser.runtime.sendMessage({ type: 'SET_BADGE', count: nOcultos })
    .catch((err) => logger.error('SET_BADGE sendMessage:', err));
}

export default defineContentScript({
  matches: ["*://forocoches.com/foro/forumdisplay.php*"],
  runAt: 'document_end',
  async main() {
    const forumStyle = getForumStyle();
    logger.debug(`Tema: ${forumStyle}`);

    // Lanzar lectura de storage en paralelo con la inyección de HTML
    const id_foro = GetURLParameter(window.location.href, 'f') ?? "2";
    const dataPromise = readLocalData().catch(err => {
      logger.error('error leyendo storage:', err);
      return null;
    });

    if (forumStyle === 'old') {
      manageOldThemeHtml();
    } else {
      manageNewThemeHtml();
    }

    // Usar datos pre-cargados
    const data = await dataPromise;
    if (data) {
      await loadFiltersAndHide(forumStyle, id_foro, data);
    }

    browser.runtime.onMessage.addListener((msg: any) => {
      if (msg.type === 'RERUN_FILTERS') {
        logger.debug('Reaplicando filtros');
        return loadFiltersAndHide(forumStyle, id_foro);
      }
    });
  },
});
