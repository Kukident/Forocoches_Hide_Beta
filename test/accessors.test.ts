import { describe, it, expect } from 'vitest';
import {
    getFilters,
    getHighlightFilters,
    getRawForumFilters,
    getActiveGroupFilters,
    getFeatureConfig,
    normalize,
    DEFAULT_FEATURE_CONFIG,
    type FcData,
} from '@/components/hideThreads/storageUtils';

// ─── getFilters ─────────────────────────────────────────────────────────────

describe('getFilters', () => {
    const data: FcData = normalize({
        f: {
            '2': { w: ['politica', 'futbol'], u: ['troll1'] },
            '17': { w: ['spam'] },
        },
    });

    it('devuelve filtros del foro', () => {
        const f = getFilters(data, '2');
        expect(f.banwords).toEqual(['politica', 'futbol']);
        expect(f.banusers).toEqual(['troll1']);
    });

    it('devuelve arrays vacios para foro sin datos', () => {
        const f = getFilters(data, '99');
        expect(f.banwords).toEqual([]);
        expect(f.banusers).toEqual([]);
    });

    it('devuelve array vacio si foro existe pero sin campo', () => {
        const f = getFilters(data, '17');
        expect(f.banwords).toEqual(['spam']);
        expect(f.banusers).toEqual([]);
    });

    it('merge global + per-forum', () => {
        const d: FcData = normalize({
            f: {
                '*': { w: ['global1'], u: ['globaluser'] },
                '2': { w: ['local1'] },
            },
        });
        const f = getFilters(d, '2');
        expect(f.banwords).toEqual(['global1', 'local1']);
        expect(f.banusers).toEqual(['globaluser']);
    });

    it('no duplica global al consultar "*"', () => {
        const d: FcData = normalize({
            f: { '*': { w: ['global1'] } },
        });
        const f = getFilters(d, '*');
        expect(f.banwords).toEqual(['global1']);
    });

    it('respeta c.enabled === false en foro', () => {
        const d: FcData = normalize({
            f: {
                '*': { w: ['global1'] },
                '2': { w: ['local1'], c: { enabled: false } },
            },
        });
        const f = getFilters(d, '2');
        expect(f.banwords).toEqual(['global1']);
    });

    it('respeta c.enabled === false en global', () => {
        const d: FcData = normalize({
            f: {
                '*': { w: ['global1'], c: { enabled: false } },
                '2': { w: ['local1'] },
            },
        });
        const f = getFilters(d, '2');
        expect(f.banwords).toEqual(['local1']);
    });
});

// ─── getHighlightFilters ────────────────────────────────────────────────────

describe('getHighlightFilters', () => {
    it('merge global + per-forum hw/hu', () => {
        const d: FcData = normalize({
            f: {
                '*': { hw: ['global_hw'], hu: ['global_hu'] },
                '2': { hw: ['local_hw'], hu: ['local_hu'] },
            },
        });
        const f = getHighlightFilters(d, '2');
        expect(f.highlightwords).toEqual(['global_hw', 'local_hw']);
        expect(f.highlightusers).toEqual(['global_hu', 'local_hu']);
    });

    it('devuelve vacios para foro sin datos', () => {
        const d: FcData = normalize();
        const f = getHighlightFilters(d, '2');
        expect(f.highlightwords).toEqual([]);
        expect(f.highlightusers).toEqual([]);
    });

    it('no duplica al consultar "*"', () => {
        const d: FcData = normalize({
            f: { '*': { hw: ['g'] } },
        });
        expect(getHighlightFilters(d, '*').highlightwords).toEqual(['g']);
    });

    it('respeta c.enabled === false', () => {
        const d: FcData = normalize({
            f: {
                '*': { hw: ['g'] },
                '2': { hw: ['l'], c: { enabled: false } },
            },
        });
        expect(getHighlightFilters(d, '2').highlightwords).toEqual(['g']);
    });
});

// ─── getRawForumFilters ─────────────────────────────────────────────────────

describe('getRawForumFilters', () => {
    it('devuelve datos crudos sin merge global', () => {
        const d: FcData = normalize({
            f: {
                '*': { w: ['global'] },
                '2': { w: ['local'], hw: ['hl'] },
            },
        });
        const raw = getRawForumFilters(d, '2');
        expect(raw.banwords).toEqual(['local']);
        expect(raw.highlightwords).toEqual(['hl']);
    });

    it('devuelve vacios para foro sin datos', () => {
        const d: FcData = normalize();
        const raw = getRawForumFilters(d, '2');
        expect(raw.banwords).toEqual([]);
        expect(raw.banusers).toEqual([]);
        expect(raw.highlightwords).toEqual([]);
        expect(raw.highlightusers).toEqual([]);
    });

    it('devuelve datos del global al pedir "*"', () => {
        const d: FcData = normalize({
            f: { '*': { w: ['global'], u: ['guser'] } },
        });
        const raw = getRawForumFilters(d, '*');
        expect(raw.banwords).toEqual(['global']);
        expect(raw.banusers).toEqual(['guser']);
    });
});

// ─── getActiveGroupFilters ──────────────────────────────────────────────────

describe('getActiveGroupFilters', () => {
    it('devuelve filtros de grupos activos', () => {
        const data: FcData = normalize({
            g: {
                'g1': { name: 'Futbol', on: true, w: ['gol', 'liga'], u: ['bot1'] },
                'g2': { name: 'Politica', on: false, w: ['pp', 'psoe'] },
                'g3': { name: 'F1', on: true, u: ['f1user'] },
            },
        });
        const f = getActiveGroupFilters(data);
        expect(f.banwords).toEqual(['gol', 'liga']);
        expect(f.banusers).toEqual(['bot1', 'f1user']);
    });

    it('excluye grupos expirados', () => {
        const data: FcData = normalize({
            g: {
                'g1': {
                    name: 'Expirado', on: true,
                    duration: 1,
                    activatedAt: Date.now() - 2 * 3_600_000,
                    w: ['expired'],
                },
            },
        });
        const f = getActiveGroupFilters(data);
        expect(f.banwords).toEqual([]);
    });

    it('incluye grupos session activos', () => {
        const data: FcData = normalize({
            g: {
                'g1': { name: 'Session', on: true, duration: 'session', w: ['sesion'] },
            },
        });
        const f = getActiveGroupFilters(data);
        expect(f.banwords).toEqual(['sesion']);
    });

    it('devuelve vacio sin grupos', () => {
        const data: FcData = normalize();
        const f = getActiveGroupFilters(data);
        expect(f.banwords).toEqual([]);
        expect(f.banusers).toEqual([]);
    });

    it('separa hide/highlight por group.type', () => {
        const data: FcData = normalize({
            g: {
                'g1': { name: 'Hide', on: true, type: 'hide', w: ['hide1'], u: ['huser'] },
                'g2': { name: 'Highlight', on: true, type: 'highlight', hw: ['hl1'], hu: ['hluser'] },
            },
        });
        const f = getActiveGroupFilters(data);
        expect(f.banwords).toEqual(['hide1']);
        expect(f.banusers).toEqual(['huser']);
        expect(f.highlightwords).toEqual(['hl1']);
        expect(f.highlightusers).toEqual(['hluser']);
    });

    it('grupo sin type se trata como hide', () => {
        const data: FcData = normalize({
            g: {
                'g1': { name: 'Default', on: true, w: ['word1'] },
            },
        });
        const f = getActiveGroupFilters(data);
        expect(f.banwords).toEqual(['word1']);
        expect(f.highlightwords).toEqual([]);
    });
});

// ─── getFeatureConfig ───────────────────────────────────────────────────────

describe('getFeatureConfig', () => {
    it('devuelve defaults si no hay features', () => {
        const data = normalize();
        const cfg = getFeatureConfig(data);
        expect(cfg).toEqual(DEFAULT_FEATURE_CONFIG);
    });

    it('merge parcial con defaults', () => {
        const data = normalize({ s: { active: true, features: { highlightOP: true } as any } });
        const cfg = getFeatureConfig(data);
        expect(cfg.highlightOP).toBe(true);
        expect(cfg.highlightThreads).toBe(true);
    });

    it('migracion filterIndicator a filterIndicatorHide/Highlight', () => {
        // Simulate data where features has filterIndicator but not the split keys.
        // normalize always fills defaults, but getFeatureConfig handles the fallback.
        const data: FcData = {
            v: 1,
            s: { active: true, features: { filterIndicator: false } as any },
            f: {},
        };
        const cfg = getFeatureConfig(data);
        expect(cfg.filterIndicatorHide).toBe(false);
        expect(cfg.filterIndicatorHighlight).toBe(false);
    });

    it('filterIndicatorHide/Highlight explicito tiene prioridad', () => {
        const data: FcData = {
            v: 1,
            s: { active: true, features: { filterIndicator: false, filterIndicatorHide: true } as any },
            f: {},
        };
        const cfg = getFeatureConfig(data);
        expect(cfg.filterIndicatorHide).toBe(true);
        expect(cfg.filterIndicatorHighlight).toBe(false);
    });
});
