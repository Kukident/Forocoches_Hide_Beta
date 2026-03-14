import { describe, it, expect } from 'vitest';
import { getRemainingLabel, type FcGroup } from '@/components/hideThreads/storageUtils';

describe('getRemainingLabel', () => {
    it('null si grupo off', () => {
        const g: FcGroup = { name: 'test', on: false, duration: 1, activatedAt: Date.now() };
        expect(getRemainingLabel(g)).toBeNull();
    });

    it('null si duracion manual', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 'manual' };
        expect(getRemainingLabel(g)).toBeNull();
    });

    it('null si sin duracion', () => {
        const g: FcGroup = { name: 'test', on: true };
        expect(getRemainingLabel(g)).toBeNull();
    });

    it('"Hasta reinicio" si duracion session', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 'session' };
        expect(getRemainingLabel(g)).toBe('Hasta reinicio');
    });

    it('devuelve horas y minutos si tiene tiempo restante', () => {
        const g: FcGroup = {
            name: 'test', on: true, duration: 3,
            activatedAt: Date.now() - 1.5 * 3_600_000, // 1.5h ago → ~1h 30m left
        };
        const label = getRemainingLabel(g);
        expect(label).not.toBeNull();
        expect(label).toMatch(/^\d+h \d+m$/);
    });

    it('devuelve solo minutos si menos de 1h', () => {
        const g: FcGroup = {
            name: 'test', on: true, duration: 1,
            activatedAt: Date.now() - 0.5 * 3_600_000, // 30min ago → ~30m left
        };
        const label = getRemainingLabel(g);
        expect(label).not.toBeNull();
        expect(label).toMatch(/^\d+m$/);
    });

    it('null si expirado', () => {
        const g: FcGroup = {
            name: 'test', on: true, duration: 1,
            activatedAt: Date.now() - 2 * 3_600_000,
        };
        expect(getRemainingLabel(g)).toBeNull();
    });

    it('null si sin activatedAt', () => {
        const g: FcGroup = { name: 'test', on: true, duration: 2 };
        expect(getRemainingLabel(g)).toBeNull();
    });
});
