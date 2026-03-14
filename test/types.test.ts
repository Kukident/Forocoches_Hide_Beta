import { describe, it, expect } from 'vitest';
import { isGroupExpired, type FcGroup } from '@/components/hideThreads/storageUtils';

describe('isGroupExpired', () => {
    it('false si grupo esta off', () => {
        const g: FcGroup = { name: 'test', on: false, duration: 1, activatedAt: Date.now() - 2 * 3_600_000 };
        expect(isGroupExpired(g)).toBe(false);
    });

    it('false si duracion manual', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 'manual' };
        expect(isGroupExpired(g)).toBe(false);
    });

    it('false si duracion session', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 'session' };
        expect(isGroupExpired(g)).toBe(false);
    });

    it('false si no ha expirado', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 2, activatedAt: Date.now() - 1 * 3_600_000 };
        expect(isGroupExpired(g)).toBe(false);
    });

    it('true si ha expirado', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 1, activatedAt: Date.now() - 2 * 3_600_000 };
        expect(isGroupExpired(g)).toBe(true);
    });

    it('false si no tiene activatedAt', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 1 };
        expect(isGroupExpired(g)).toBe(false);
    });

    it('false si no tiene duracion', () => {
        const g: FcGroup = { name: 'test', on: true };
        expect(isGroupExpired(g)).toBe(false);
    });
});
