import { describe, it, expect } from 'vitest';
import { detectVersion, runMigrations } from '@/components/hideThreads/migrations';
import { importLegacy } from '@/components/hideThreads/migrations/v0';

describe('detectVersion', () => {
    it('v1 devuelve 1', () => {
        expect(detectVersion({ v: 1 })).toBe(1);
    });

    it('v8 devuelve 1 (pre-renumeracion)', () => {
        expect(detectVersion({ v: 8 })).toBe(1);
    });

    it('key "filtrar" devuelve 0', () => {
        expect(detectVersion({ filtrar: { options: {} } })).toBe(0);
    });

    it('claves planas v0 devuelve 0', () => {
        expect(detectVersion({ f_2_banwords_0: ['test'] })).toBe(0);
    });

    it('desconocido devuelve null', () => {
        expect(detectVersion({ random: 'data' })).toBeNull();
    });

    it('v2 devuelve 2', () => {
        expect(detectVersion({ v: 2 })).toBe(2);
    });
});

describe('runMigrations', () => {
    it('v1 normaliza sin migrar', () => {
        const result = runMigrations({
            v: 1, s: { active: true },
            f: { '2': { w: ['test'] } },
        }, 1);
        expect(result).not.toBeNull();
        expect(result!.v).toBe(1);
        expect(result!.f['2'].w).toEqual(['test']);
    });

    it('v0 migra a v1', () => {
        const result = runMigrations({
            filtrar: { options: { active: false } },
            f_2_banwords_0: ['word1', 'word2'],
            f_2_banusers_0: ['user1'],
        }, 0);
        expect(result).not.toBeNull();
        expect(result!.v).toBe(1);
        expect(result!.s.active).toBe(false);
        expect(result!.f['2'].w).toEqual(['word1', 'word2']);
        expect(result!.f['2'].u).toEqual(['user1']);
    });

    it('version futura (>1) devuelve datos sin migrar', () => {
        // fromVersion > CURRENT_VERSION: while loop condition (currentV < 1) is false,
        // so data is returned as-is (no downgrade migrations exist).
        const result = runMigrations({ v: 5, s: { active: true }, f: {} }, 5);
        // Returns the raw data since it can't migrate down
        expect(result).not.toBeNull();
    });
});

describe('importLegacy', () => {
    it('parsea datos v0 con filtrar', () => {
        const result = importLegacy({
            filtrar: { options: { active: true } },
            f_2_banwords_0: ['hello\\.world'],
            f_2_banusers_0: ['troll'],
        });
        expect(result.s.active).toBe(true);
        expect(result.f['2'].w).toEqual(['hello.world']); // unescaped
        expect(result.f['2'].u).toEqual(['troll']);
    });

    it('parsea multiples chunks', () => {
        const result = importLegacy({
            f_17_banwords_0: ['a', 'b'],
            f_17_banwords_1: ['c'],
        });
        expect(result.f['17'].w).toEqual(['a', 'b', 'c']);
    });

    it('preserva active: false', () => {
        const result = importLegacy({
            filtrar: { options: { active: false } },
        });
        expect(result.s.active).toBe(false);
    });

    it('sin filtrar usa default active: true', () => {
        const result = importLegacy({
            f_2_banwords_0: ['word'],
        });
        expect(result.s.active).toBe(true);
    });
});
