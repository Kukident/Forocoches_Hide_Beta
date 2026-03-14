import { describe, it, expect } from 'vitest';
import { escapeRegExp, GetURLParameter } from '@/components/hideThreads/storageUtils';

describe('escapeRegExp', () => {
    it('escapa caracteres especiales de regex', () => {
        expect(escapeRegExp('hello.world')).toBe('hello\\.world');
        expect(escapeRegExp('a+b*c?')).toBe('a\\+b\\*c\\?');
        expect(escapeRegExp('(test)')).toBe('\\(test\\)');
        expect(escapeRegExp('[abc]')).toBe('\\[abc\\]');
        expect(escapeRegExp('a|b')).toBe('a\\|b');
    });

    it('no modifica texto sin caracteres especiales', () => {
        expect(escapeRegExp('hola')).toBe('hola');
    });
});

describe('GetURLParameter', () => {
    it('extrae parametro de URL valida', () => {
        expect(GetURLParameter('https://forocoches.com/foro/forumdisplay.php?f=2', 'f')).toBe('2');
    });

    it('devuelve undefined si parametro no existe', () => {
        expect(GetURLParameter('https://forocoches.com/foro/forumdisplay.php?f=2', 'g')).toBeUndefined();
    });

    it('devuelve undefined para URL invalida', () => {
        expect(GetURLParameter('not-a-url', 'f')).toBeUndefined();
    });

    it('extrae parametro de showthread', () => {
        expect(GetURLParameter('https://forocoches.com/foro/showthread.php?t=12345', 't')).toBe('12345');
    });
});
