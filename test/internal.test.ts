import { describe, it, expect } from 'vitest';
import {
    assertForumId,
    assertGroupId,
    stableStringify,
    hashString,
} from '@/components/hideThreads/_internal';

describe('assertForumId', () => {
    it('acepta IDs validos', () => {
        expect(() => assertForumId('2')).not.toThrow();
        expect(() => assertForumId('*')).not.toThrow();
        expect(() => assertForumId('abc-123')).not.toThrow();
        expect(() => assertForumId('abc_def')).not.toThrow();
    });

    it('rechaza ID vacio', () => {
        expect(() => assertForumId('')).toThrow('Forum ID inválido');
    });

    it('rechaza ID con espacios', () => {
        expect(() => assertForumId('ab cd')).toThrow('Forum ID inválido');
    });

    it('rechaza inyeccion HTML', () => {
        expect(() => assertForumId('<script>')).toThrow('Forum ID inválido');
    });

    it('rechaza caracteres especiales', () => {
        expect(() => assertForumId('a/b')).toThrow('Forum ID inválido');
        expect(() => assertForumId('a.b')).toThrow('Forum ID inválido');
    });
});

describe('assertGroupId', () => {
    it('acepta UUID valido', () => {
        expect(() => assertGroupId('12345678-1234-1234-1234-123456789abc')).not.toThrow();
        expect(() => assertGroupId('abcdef00-0000-0000-0000-000000000000')).not.toThrow();
    });

    it('rechaza string vacio', () => {
        expect(() => assertGroupId('')).toThrow('Group ID inválido');
    });

    it('rechaza string no-UUID', () => {
        expect(() => assertGroupId('not-a-uuid')).toThrow('Group ID inválido');
    });

    it('rechaza UUID con mayusculas', () => {
        expect(() => assertGroupId('12345678-1234-1234-1234-123456789ABC')).toThrow('Group ID inválido');
    });
});

describe('stableStringify', () => {
    it('serializa primitivos', () => {
        expect(stableStringify(null)).toBe('null');
        expect(stableStringify(42)).toBe('42');
        expect(stableStringify('hello')).toBe('"hello"');
        expect(stableStringify(true)).toBe('true');
    });

    it('serializa arrays', () => {
        expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
        expect(stableStringify([])).toBe('[]');
    });

    it('serializa objetos con claves ordenadas', () => {
        expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
        expect(stableStringify({ z: 'z', a: 'a', m: 'm' })).toBe('{"a":"a","m":"m","z":"z"}');
    });

    it('misma salida independiente del orden de insercion', () => {
        const obj1 = { a: 1, b: 2, c: 3 };
        const obj2 = { c: 3, a: 1, b: 2 };
        expect(stableStringify(obj1)).toBe(stableStringify(obj2));
    });

    it('serializa objetos anidados', () => {
        const obj = { b: { d: 1, c: 2 }, a: [3, 2, 1] };
        expect(stableStringify(obj)).toBe('{"a":[3,2,1],"b":{"c":2,"d":1}}');
    });

    it('serializa objeto vacio', () => {
        expect(stableStringify({})).toBe('{}');
    });
});

describe('hashString', () => {
    it('devuelve string determinista', () => {
        expect(hashString('hello')).toBe(hashString('hello'));
    });

    it('diferentes inputs producen diferentes hashes', () => {
        expect(hashString('hello')).not.toBe(hashString('world'));
    });

    it('string vacio produce hash', () => {
        const h = hashString('');
        expect(typeof h).toBe('string');
        expect(h.length).toBeGreaterThan(0);
    });

    it('devuelve base-36', () => {
        const h = hashString('test');
        expect(/^[0-9a-z]+$/.test(h)).toBe(true);
    });
});
