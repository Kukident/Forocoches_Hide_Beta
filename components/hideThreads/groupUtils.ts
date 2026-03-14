import type { FcGroup } from './types';

export function getRemainingLabel(group: FcGroup): string | null {
  if (!group.on || !group.duration || group.duration === 'manual') return null;
  if (group.duration === 'session') return 'Hasta reinicio';
  if (typeof group.duration === 'number' && group.activatedAt) {
    const rem = group.activatedAt + group.duration * 3_600_000 - Date.now();
    if (rem <= 0) return null;
    const h = Math.floor(rem / 3_600_000);
    const m = Math.floor((rem % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
  return null;
}
