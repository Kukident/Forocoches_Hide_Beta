import { logger } from '@/components/utils/logger';

export function getForumStyle(): string {
    if (document.getElementById('fc-desktop-version-tag-for-monitoring')) {
        return 'new';
    }
    // Heurística secundaria: verificar que realmente estamos en el tema viejo
    const isLikelyOld = !!document.getElementById('threadslist') || !!document.querySelector('table.tborder');
    if (!isLikelyOld) {
        logger.warn('forumStyle: tema "old" asumido pero no se encontraron elementos típicos del tema viejo');
    }
    return 'old';
}