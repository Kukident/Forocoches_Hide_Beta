import { describe, it, expect } from 'vitest';
import {
    normalize,
    validateFcData,
    validateSyncData,
    DEFAULT_FEATURE_CONFIG,
    type FcData,
} from '@/components/hideThreads/storageUtils';

// ─── normalize ──────────────────────────────────────────────────────────────

describe('normalize', () => {
    it('devuelve datos v1 vacios por defecto', () => {
        const data = normalize();
        expect(data.v).toBe(1);
        expect(data.s.active).toBe(true);
        expect(data.f).toEqual({});
        expect(data.g).toBeUndefined();
        expect(data.users).toBeUndefined();
    });

    it('preserva datos parciales', () => {
        const data = normalize({
            s: { active: false },
            f: { '2': { w: ['test'] } },
        });
        expect(data.s.active).toBe(false);
        expect(data.f['2'].w).toEqual(['test']);
    });

    it('aplica defaults a features faltantes', () => {
        const data = normalize({ s: { active: true, features: { highlightOP: true } as any } });
        expect(data.s.features!.highlightOP).toBe(true);
        expect(data.s.features!.highlightThreads).toBe(true);
        expect(data.s.features!.highlightOPColor).toBe(DEFAULT_FEATURE_CONFIG.highlightOPColor);
    });

    it('omite g/users si estan vacios', () => {
        const data = normalize({ g: {}, users: {} });
        expect(data.g).toBeUndefined();
        expect(data.users).toBeUndefined();
    });

    it('conserva g y users con datos', () => {
        const data = normalize({
            g: { 'g1': { name: 'test', on: false } },
            users: { 'user1': { note: 'nota' } },
        });
        expect(data.g).toBeDefined();
        expect(data.g!['g1'].name).toBe('test');
        expect(data.users).toEqual({ 'user1': { note: 'nota' } });
    });

    it('preserva ignored', () => {
        const data = normalize({ ignored: ['troll1', 'troll2'] });
        expect(data.ignored).toEqual(['troll1', 'troll2']);
    });

    it('omite ignored vacio', () => {
        const data = normalize({ ignored: [] });
        expect(data.ignored).toBeUndefined();
    });

    it('features merge completo con defaults', () => {
        const data = normalize({ s: { active: true, features: { readingProgress: true } as any } });
        expect(data.s.features!.readingProgress).toBe(true);
        expect(data.s.features!.hideThreads).toBe(true);
        expect(data.s.features!.ignoreUsersMode).toBe('spoiler');
    });

    it('no incluye campos desconocidos de v7 (notes, vip, hw, hu)', () => {
        const data = normalize({ notes: {}, vip: [], hw: [], hu: [] } as any);
        expect((data as any).notes).toBeUndefined();
        expect((data as any).vip).toBeUndefined();
        expect((data as any).hw).toBeUndefined();
        expect((data as any).hu).toBeUndefined();
    });
});

// ─── validateFcData ─────────────────────────────────────────────────────────

describe('validateFcData', () => {
    it('data v1 valida devuelve array vacio', () => {
        const data = normalize();
        expect(validateFcData(data)).toEqual([]);
    });

    it('null devuelve error', () => {
        expect(validateFcData(null)).toEqual(['data no es un objeto']);
    });

    it('array devuelve error', () => {
        expect(validateFcData([])).toEqual(['data no es un objeto']);
    });

    it('falta v devuelve error', () => {
        const errors = validateFcData({ s: { active: true }, f: {} });
        expect(errors).toContain('v debe ser 1, es undefined');
    });

    it('v incorrecto devuelve error', () => {
        const errors = validateFcData({ v: 2, s: { active: true }, f: {} });
        expect(errors).toContain('v debe ser 1, es 2');
    });

    it('s invalido devuelve error', () => {
        const errors = validateFcData({ v: 1, s: 'bad', f: {} });
        expect(errors).toContain('s no es un objeto');
    });

    it('s.active no boolean devuelve error', () => {
        const errors = validateFcData({ v: 1, s: { active: 'yes' }, f: {} });
        expect(errors).toContain('s.active no es boolean');
    });

    it('f invalido devuelve error', () => {
        const errors = validateFcData({ v: 1, s: { active: true }, f: 'bad' });
        expect(errors).toContain('f no es un objeto');
    });

    it('entry de foro invalida devuelve error', () => {
        const errors = validateFcData({ v: 1, s: { active: true }, f: { '2': { w: 'notarray' } } });
        expect(errors.some(e => e.includes('f["2"]'))).toBe(true);
    });

    it('entry de grupo invalida devuelve error', () => {
        const errors = validateFcData({ v: 1, s: { active: true }, f: {}, g: { 'g1': { name: 123 } } });
        expect(errors.some(e => e.includes('g["g1"]'))).toBe(true);
    });

    it('entry de user invalida devuelve error', () => {
        const errors = validateFcData({ v: 1, s: { active: true }, f: {}, users: { 'u1': { note: 123 } } });
        expect(errors.some(e => e.includes('users["u1"]'))).toBe(true);
    });

    it('ignored no array devuelve error', () => {
        const errors = validateFcData({ v: 1, s: { active: true }, f: {}, ignored: 'notarray' });
        expect(errors).toContain('ignored no es un array de strings');
    });

    it('data completa valida', () => {
        const data: FcData = normalize({
            f: { '2': { w: ['a'], u: ['b'], hw: ['c'], hu: ['d'], c: { enabled: true } } },
            g: { 'abc12345-1234-1234-1234-123456789abc': { name: 'G1', on: true, type: 'hide', w: ['x'] } },
            users: { 'user1': { note: 'hi', highlightThread: true, threadColor: '#fff' } },
            ignored: ['troll'],
        });
        expect(validateFcData(data)).toEqual([]);
    });
});

// ─── validateSyncData ───────────────────────────────────────────────────────

describe('validateSyncData', () => {
    it('null input devuelve null', () => {
        expect(validateSyncData(null)).toBeNull();
    });

    it('no-object devuelve null', () => {
        expect(validateSyncData('string')).toBeNull();
        expect(validateSyncData(42)).toBeNull();
    });

    it('version incorrecta devuelve null', () => {
        expect(validateSyncData({ v: 2, s: { active: true }, f: {} })).toBeNull();
    });

    it('sin s devuelve null', () => {
        expect(validateSyncData({ v: 1, f: {} })).toBeNull();
    });

    it('data valida devuelve FcData normalizado', () => {
        const result = validateSyncData({ v: 1, s: { active: false }, f: { '2': { w: ['test'] } } });
        expect(result).not.toBeNull();
        expect(result!.v).toBe(1);
        expect(result!.s.active).toBe(false);
        expect(result!.f['2'].w).toEqual(['test']);
    });

    it('trunca arrays largos', () => {
        const longWords = Array.from({ length: 6000 }, (_, i) => `word${i}`);
        const result = validateSyncData({ v: 1, s: { active: true }, f: { '2': { w: longWords } } });
        expect(result!.f['2'].w!.length).toBeLessThanOrEqual(5000);
    });

    it('trunca strings largos', () => {
        const longString = 'a'.repeat(1000);
        const result = validateSyncData({ v: 1, s: { active: true }, f: {}, users: { 'u1': { note: longString } } });
        expect(result!.users!['u1'].note!.length).toBeLessThanOrEqual(500);
    });

    it('filtra forum IDs invalidos', () => {
        const result = validateSyncData({ v: 1, s: { active: true }, f: { '2': { w: ['ok'] }, '<script>': { w: ['bad'] } } });
        expect(result!.f['2']).toBeDefined();
        expect(result!.f['<script>']).toBeUndefined();
    });

    it('filtra entries de foro vacias', () => {
        const result = validateSyncData({ v: 1, s: { active: true }, f: { '2': {} } });
        expect(result!.f['2']).toBeUndefined();
    });

    it('filtra entries de user vacias', () => {
        const result = validateSyncData({ v: 1, s: { active: true }, f: {}, users: { 'u1': {} } });
        expect(result!.users).toBeUndefined();
    });

    it('valida grupos correctamente', () => {
        const result = validateSyncData({
            v: 1, s: { active: true }, f: {},
            g: { 'g1': { name: 'Test', on: true, w: ['word'], type: 'hide' } },
        });
        expect(result!.g!['g1'].name).toBe('Test');
        expect(result!.g!['g1'].w).toEqual(['word']);
    });

    it('filtra grupos invalidos', () => {
        const result = validateSyncData({
            v: 1, s: { active: true }, f: {},
            g: { 'g1': { name: '', on: true } },
        });
        expect(result!.g).toBeUndefined();
    });
});
