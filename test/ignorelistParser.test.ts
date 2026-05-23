import { describe, it, expect } from 'vitest';
import { parseIgnorelist, decodeHtmlEntities } from '@/components/utils/ignorelistParser';

const wrapList = (inner: string) => `
<html><body>
<form action="profile.php?do=updatelist" method="post">
  <ul id="ignorelist">${inner}</ul>
</form>
</body></html>`;

const userLi = (id: number, name: string) =>
    `<li><a href="member.php?u=${id}">${name}</a></li>`;

describe('decodeHtmlEntities', () => {
    it('decodifica entidades nombradas', () => {
        expect(decodeHtmlEntities('Pepe &amp; Juan')).toBe('Pepe & Juan');
        expect(decodeHtmlEntities('a &lt;b&gt; c')).toBe('a <b> c');
        expect(decodeHtmlEntities('&quot;hola&quot;')).toBe('"hola"');
        expect(decodeHtmlEntities('it&#39;s')).toBe("it's");
        expect(decodeHtmlEntities('it&apos;s')).toBe("it's");
    });

    it('decodifica entidades numéricas decimales y hex', () => {
        expect(decodeHtmlEntities('&#241;')).toBe('ñ');
        expect(decodeHtmlEntities('&#xf1;')).toBe('ñ');
        expect(decodeHtmlEntities('&#xF1;')).toBe('ñ');
    });

    it('deja intacto texto sin entidades', () => {
        expect(decodeHtmlEntities('Forocoches')).toBe('Forocoches');
    });
});

describe('parseIgnorelist', () => {
    it('devuelve null si no hay <ul id="ignorelist"> (página de login)', () => {
        const loginPage = '<html><body><form action="login.php"><input name="vb_login_username"/></form></body></html>';
        expect(parseIgnorelist(loginPage)).toBeNull();
    });

    it('devuelve [] si la lista existe pero está vacía', () => {
        expect(parseIgnorelist(wrapList(''))).toEqual([]);
    });

    it('extrae usuarios simples', () => {
        const html = wrapList(userLi(1, 'troll1') + userLi(2, 'troll2'));
        expect(parseIgnorelist(html)).toEqual(['troll1', 'troll2']);
    });

    it('soporta comillas simples en atributos', () => {
        const html = `<ul id='ignorelist'><li><a href='member.php?u=1'>pepe</a></li></ul>`;
        expect(parseIgnorelist(html)).toEqual(['pepe']);
    });

    it('decodifica entidades en los nombres', () => {
        const html = wrapList(userLi(1, 'Pepe &amp; Juan') + userLi(2, 'Mar&#237;a'));
        expect(parseIgnorelist(html)).toEqual(['Pepe & Juan', 'María']);
    });

    it('hace trim de espacios alrededor del nombre', () => {
        const html = wrapList('<li><a href="member.php?u=1">  spaced  </a></li>');
        expect(parseIgnorelist(html)).toEqual(['spaced']);
    });

    it('ignora enlaces que no sean de member.php', () => {
        const html = wrapList(
            '<li><a href="showthread.php?t=1">no-user</a></li>' +
            userLi(2, 'usuario_real')
        );
        expect(parseIgnorelist(html)).toEqual(['usuario_real']);
    });

    it('soporta atributos extra y orden distinto en el <a>', () => {
        const html = `<ul id="ignorelist" class="userlist"><li><a class="bold" href="member.php?u=42" title="Ver perfil">Kukident</a></li></ul>`;
        expect(parseIgnorelist(html)).toEqual(['Kukident']);
    });

    it('no captura nada fuera del bloque <ul id="ignorelist">', () => {
        const html = `
            <a href="member.php?u=99">fuera</a>
            ${wrapList(userLi(1, 'dentro'))}
            <a href="member.php?u=100">también_fuera</a>
        `;
        expect(parseIgnorelist(html)).toEqual(['dentro']);
    });

    it('maneja múltiples usuarios con saltos de línea y whitespace', () => {
        const html = `<ul id="ignorelist">
            <li>
                <a href="member.php?u=1">
                    usuario1
                </a>
            </li>
            <li>
                <a href="member.php?u=2">usuario2</a>
            </li>
        </ul>`;
        expect(parseIgnorelist(html)).toEqual(['usuario1', 'usuario2']);
    });

    it('detecta ID en mayúsculas/insensible (defensivo)', () => {
        const html = `<UL ID="ignorelist"><li><a href="member.php?u=1">x</a></li></UL>`;
        expect(parseIgnorelist(html)).toEqual(['x']);
    });
});
