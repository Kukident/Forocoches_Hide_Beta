import type { FcUserEntry, FcFeatureConfig } from '@/components/hideThreads/types';
import { getPostAuthor, getAuthorElement } from './domHelpers';
import { wrapWithSpoiler, hidePostFully, injectNoteInPost, highlightPostContainer } from './postDecorations';

export function applyPostFeatures(
  containers: HTMLElement[],
  theme: 'old' | 'new',
  opUsername: string | null,
  banusers: string[],
  users: Record<string, FcUserEntry>,
  features: FcFeatureConfig,
): void {
  const banuserSet = new Set(banusers.map(u => u.toLowerCase().trim()));

  for (const container of containers) {
    const author = getPostAuthor(container, theme);
    const authorLower = author.toLowerCase();
    const userEntry = users[authorLower];

    // -- Ignorar usuarios en posts
    if (features.ignoreUsersInPosts && banuserSet.has(authorLower)) {
      if (features.ignoreUsersMode === 'hide') {
        hidePostFully(container, author, theme);
      } else {
        wrapWithSpoiler(container, author, theme);
      }
      continue;
    }

    // -- Resaltar OP (solo si lo conocemos)
    if (features.highlightOP && opUsername && authorLower === opUsername) {
      highlightPostContainer(container, features.highlightOPColor, theme, features.highlightOPMode);
    }

    // -- Resaltar VIP (per-user)
    if (features.highlightVIPPosts && userEntry?.highlightPost) {
      highlightPostContainer(
        container,
        userEntry.postColor ?? features.highlightVIPPostColor,
        theme,
        features.highlightVIPPostMode,
      );
    }

    // -- Notas de usuario
    if (features.userNotes && userEntry?.note) {
      const authorEl = getAuthorElement(container, theme);
      if (authorEl) {
        injectNoteInPost(authorEl, userEntry.note);
      }
    }
  }
}
