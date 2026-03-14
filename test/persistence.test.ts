import { describe, it, expect, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { seedStorage, readAllLocal } from './setup';
import {
    save_words,
    save_forum_batch,
    saveUser,
    saveGroup,
    toggleGroup,
    saveFeatureConfig,
    saveForumConfig,
    saveGlobalList,
    setGroupDuration,
    setGroupVisible,
    disableSessionAndExpiredGroups,
    deactivateExpiredGroup,
    normalize,
    META_KEY,
    FORUM_KEY_PREFIX,
    GROUP_KEY_PREFIX,
    USERS_KEY,
    IGNORED_KEY,
    type FcData,
} from '@/components/hideThreads/storageUtils';

const UUID1 = '00000000-0000-0000-0000-000000000001';
const UUID2 = '00000000-0000-0000-0000-000000000002';

// ─── save_words ─────────────────────────────────────────────────────────────

describe('save_words', () => {
    it('escribe banwords en fc_f_{id}', async () => {
        await seedStorage();
        await save_words('2', 'banwords', ['politica', 'futbol']);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].w).toEqual(['politica', 'futbol']);
    });

    it('añade foro a fc_meta.fids', async () => {
        await seedStorage();
        await save_words('2', 'banwords', ['test']);
        const all = readAllLocal();
        expect(all[META_KEY].fids).toContain('2');
    });

    it('elimina clave cuando array vacio', async () => {
        await seedStorage({ f: { '2': { w: ['old'] } } });
        await save_words('2', 'banwords', []);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`]).toBeUndefined();
    });

    it('elimina foro de fids cuando vacio', async () => {
        await seedStorage({ f: { '2': { w: ['old'] } } });
        await save_words('2', 'banwords', []);
        const all = readAllLocal();
        expect(all[META_KEY].fids ?? []).not.toContain('2');
    });

    it('envia SCHEDULE_SYNC', async () => {
        await seedStorage();
        await save_words('2', 'banwords', ['test']);
        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SCHEDULE_SYNC' });
    });

    it('escribe banusers', async () => {
        await seedStorage();
        await save_words('2', 'banusers', ['troll']);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].u).toEqual(['troll']);
    });

    it('escribe highlightwords', async () => {
        await seedStorage();
        await save_words('2', 'highlightwords', ['oferta']);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].hw).toEqual(['oferta']);
    });

    it('escribe highlightusers', async () => {
        await seedStorage();
        await save_words('2', 'highlightusers', ['amigo']);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].hu).toEqual(['amigo']);
    });

    it('conserva otros campos al actualizar uno', async () => {
        await seedStorage({ f: { '2': { w: ['existing'], u: ['user1'] } } });
        await save_words('2', 'banwords', ['new']);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].w).toEqual(['new']);
        expect(all[`${FORUM_KEY_PREFIX}2`].u).toEqual(['user1']);
    });

    it('rechaza forum ID invalido', () => {
        expect(() => save_words('<script>', 'banwords', ['x'])).toThrow('Forum ID inválido');
    });
});

// ─── save_forum_batch ───────────────────────────────────────────────────────

describe('save_forum_batch', () => {
    it('escribe multiples campos atomicamente', async () => {
        await seedStorage();
        await save_forum_batch('2', { banwords: ['w1'], banusers: ['u1'], highlightwords: ['hw1'] });
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].w).toEqual(['w1']);
        expect(all[`${FORUM_KEY_PREFIX}2`].u).toEqual(['u1']);
        expect(all[`${FORUM_KEY_PREFIX}2`].hw).toEqual(['hw1']);
    });

    it('elimina campo cuando array vacio', async () => {
        await seedStorage({ f: { '2': { w: ['old'], u: ['keep'] } } });
        await save_forum_batch('2', { banwords: [] });
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].w).toBeUndefined();
        expect(all[`${FORUM_KEY_PREFIX}2`].u).toEqual(['keep']);
    });
});

// ─── saveUser ───────────────────────────────────────────────────────────────

describe('saveUser', () => {
    it('crea usuario en fc_users', async () => {
        await seedStorage();
        await saveUser('TestUser', { note: 'hello' });
        const all = readAllLocal();
        expect(all[USERS_KEY]['testuser'].note).toBe('hello');
    });

    it('lowercase username', async () => {
        await seedStorage();
        await saveUser('UpperCase', { note: 'test' });
        const all = readAllLocal();
        expect(all[USERS_KEY]['uppercase']).toBeDefined();
        expect(all[USERS_KEY]['UpperCase']).toBeUndefined();
    });

    it('limpia campos vacios', async () => {
        await seedStorage();
        await saveUser('user1', { note: '', highlightThread: false, highlightPost: true });
        const all = readAllLocal();
        expect(all[USERS_KEY]['user1']).toEqual({ highlightPost: true });
    });

    it('elimina entry si todos los campos vacios', async () => {
        await seedStorage({ users: { 'user1': { note: 'old' } } });
        await saveUser('user1', { note: '' });
        const all = readAllLocal();
        expect(all[USERS_KEY]).toBeUndefined();
    });

    it('elimina entry con null', async () => {
        await seedStorage({ users: { 'user1': { note: 'old' } } });
        await saveUser('user1', null);
        const all = readAllLocal();
        expect(all[USERS_KEY]).toBeUndefined();
    });

    it('envia SCHEDULE_SYNC', async () => {
        await seedStorage();
        await saveUser('user1', { note: 'test' });
        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SCHEDULE_SYNC' });
    });

    it('preserva otros usuarios al crear', async () => {
        await seedStorage({ users: { 'existing': { note: 'keep' } } });
        await saveUser('new', { note: 'new' });
        const all = readAllLocal();
        expect(all[USERS_KEY]['existing'].note).toBe('keep');
        expect(all[USERS_KEY]['new'].note).toBe('new');
    });

    it('crea fc_meta si no existe', async () => {
        // No seed — empty storage
        await saveUser('user1', { note: 'test' });
        const all = readAllLocal();
        expect(all[META_KEY]).toBeDefined();
        expect(all[META_KEY].v).toBe(1);
    });

    it('guarda highlightThread con color', async () => {
        await seedStorage();
        await saveUser('vip1', { highlightThread: true, threadColor: '#ff0000' });
        const all = readAllLocal();
        expect(all[USERS_KEY]['vip1']).toEqual({ highlightThread: true, threadColor: '#ff0000' });
    });
});

// ─── saveGroup ──────────────────────────────────────────────────────────────

describe('saveGroup', () => {
    it('crea grupo en fc_g_{id}', async () => {
        await seedStorage();
        const group = { name: 'Futbol', on: true, w: ['liga'] };
        await saveGroup(UUID1, group);
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`]).toEqual(group);
    });

    it('añade a gids', async () => {
        await seedStorage();
        await saveGroup(UUID1, { name: 'Test', on: false });
        const all = readAllLocal();
        expect(all[META_KEY].gids).toContain(UUID1);
    });

    it('elimina cuando null', async () => {
        await seedStorage({
            g: { [UUID1]: { name: 'Test', on: false } },
        });
        await saveGroup(UUID1, null);
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`]).toBeUndefined();
    });

    it('elimina de gids cuando null', async () => {
        await seedStorage({
            g: { [UUID1]: { name: 'Test', on: false } },
        });
        await saveGroup(UUID1, null);
        const all = readAllLocal();
        expect(all[META_KEY].gids ?? []).not.toContain(UUID1);
    });

    it('envia SCHEDULE_SYNC', async () => {
        await seedStorage();
        await saveGroup(UUID1, { name: 'Test', on: false });
        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SCHEDULE_SYNC' });
    });

    it('rechaza ID invalido', () => {
        expect(() => saveGroup('bad-id', { name: 'Test', on: false })).toThrow('Group ID inválido');
    });
});

// ─── toggleGroup ────────────────────────────────────────────────────────────

describe('toggleGroup', () => {
    it('flip on/off', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: false } } });
        const result = await toggleGroup(UUID1);
        expect(result!.on).toBe(true);
    });

    it('flip off/on', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: true } } });
        const result = await toggleGroup(UUID1);
        expect(result!.on).toBe(false);
    });

    it('sets activatedAt en grupos con duracion', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: false, duration: 2 } } });
        const before = Date.now();
        const result = await toggleGroup(UUID1);
        expect(result!.on).toBe(true);
        expect(result!.activatedAt).toBeGreaterThanOrEqual(before);
    });

    it('limpia activatedAt al desactivar', async () => {
        await seedStorage({
            g: { [UUID1]: { name: 'G', on: true, duration: 2, activatedAt: Date.now() } },
        });
        const result = await toggleGroup(UUID1);
        expect(result!.on).toBe(false);
        expect(result!.activatedAt).toBeUndefined();
    });

    it('devuelve null si grupo no existe', async () => {
        await seedStorage();
        const result = await toggleGroup(UUID1);
        expect(result).toBeNull();
    });

    it('persiste en storage', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: false } } });
        await toggleGroup(UUID1);
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].on).toBe(true);
    });
});

// ─── saveFeatureConfig ──────────────────────────────────────────────────────

describe('saveFeatureConfig', () => {
    it('patch parcial merge con defaults', async () => {
        await seedStorage();
        await saveFeatureConfig({ highlightOP: false });
        const all = readAllLocal();
        expect(all[META_KEY].s.features.highlightOP).toBe(false);
        expect(all[META_KEY].s.features.highlightThreads).toBe(true);
    });

    it('envia SCHEDULE_SYNC', async () => {
        await seedStorage();
        await saveFeatureConfig({ highlightOP: true });
        expect(browser.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SCHEDULE_SYNC' });
    });

    it('crea fc_meta si no existe', async () => {
        await saveFeatureConfig({ readingProgress: true });
        const all = readAllLocal();
        expect(all[META_KEY]).toBeDefined();
        expect(all[META_KEY].s.features.readingProgress).toBe(true);
    });
});

// ─── saveForumConfig ────────────────────────────────────────────────────────

describe('saveForumConfig', () => {
    it('guarda config de foro', async () => {
        await seedStorage({ f: { '2': { w: ['test'] } } });
        await saveForumConfig('2', { caseSensitive: true });
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].c.caseSensitive).toBe(true);
    });

    it('no almacena enabled: true', async () => {
        await seedStorage({ f: { '2': { w: ['test'] } } });
        await saveForumConfig('2', { enabled: true });
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].c).toBeUndefined();
    });

    it('enabled: false se almacena', async () => {
        await seedStorage({ f: { '2': { w: ['test'] } } });
        await saveForumConfig('2', { enabled: false });
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`].c.enabled).toBe(false);
    });
});

// ─── saveGlobalList ─────────────────────────────────────────────────────────

describe('saveGlobalList', () => {
    it('guarda ignored list', async () => {
        await seedStorage();
        await saveGlobalList('ignored', ['troll1', 'troll2']);
        const all = readAllLocal();
        expect(all[IGNORED_KEY]).toEqual(['troll1', 'troll2']);
    });

    it('elimina clave si lista vacia', async () => {
        await seedStorage({ ignored: ['old'] });
        await saveGlobalList('ignored', []);
        const all = readAllLocal();
        expect(all[IGNORED_KEY]).toBeUndefined();
    });
});

// ─── disableSessionAndExpiredGroups ──────────────────────────────────────────

describe('disableSessionAndExpiredGroups', () => {
    it('desactiva grupos session', async () => {
        const data: FcData = normalize({
            g: { [UUID1]: { name: 'Session', on: true, duration: 'session' } },
        });
        await seedStorage(data);
        const changed = await disableSessionAndExpiredGroups(data);
        expect(changed).toBe(true);
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].on).toBe(false);
    });

    it('desactiva grupos expirados', async () => {
        const data: FcData = normalize({
            g: { [UUID1]: { name: 'Exp', on: true, duration: 1, activatedAt: Date.now() - 2 * 3_600_000 } },
        });
        await seedStorage(data);
        const changed = await disableSessionAndExpiredGroups(data);
        expect(changed).toBe(true);
    });

    it('no cambia si no hay grupos afectados', async () => {
        const data: FcData = normalize({
            g: { [UUID1]: { name: 'Manual', on: true, duration: 'manual' } },
        });
        await seedStorage(data);
        const changed = await disableSessionAndExpiredGroups(data);
        expect(changed).toBe(false);
    });

    it('retorna false sin grupos', async () => {
        const data = normalize();
        const changed = await disableSessionAndExpiredGroups(data);
        expect(changed).toBe(false);
    });
});

// ─── deactivateExpiredGroup ─────────────────────────────────────────────────

describe('deactivateExpiredGroup', () => {
    it('desactiva grupo on', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: true, duration: 1, activatedAt: Date.now() } } });
        const changed = await deactivateExpiredGroup(UUID1);
        expect(changed).toBe(true);
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].on).toBe(false);
    });

    it('no actua si grupo off', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: false } } });
        const changed = await deactivateExpiredGroup(UUID1);
        expect(changed).toBe(false);
    });

    it('devuelve false si no existe', async () => {
        await seedStorage();
        const changed = await deactivateExpiredGroup(UUID1);
        expect(changed).toBe(false);
    });
});

// ─── setGroupDuration ───────────────────────────────────────────────────────

describe('setGroupDuration', () => {
    it('actualiza duracion de grupo activo', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: true, duration: 1, activatedAt: Date.now() } } });
        await setGroupDuration(UUID1, 5);
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].duration).toBe(5);
    });

    it('manual elimina duration y activatedAt', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: true, duration: 2, activatedAt: 123 } } });
        await setGroupDuration(UUID1, 'manual');
        const all = readAllLocal();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].duration).toBeUndefined();
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].activatedAt).toBeUndefined();
    });

    it('no actua si grupo off', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: false } } });
        await setGroupDuration(UUID1, 3);
        const all = readAllLocal();
        // No cambio — la funcion retorna sin modificar
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].duration).toBeUndefined();
    });
});

// ─── setGroupVisible ────────────────────────────────────────────────────────

describe('setGroupVisible', () => {
    it('oculta grupo y lo desactiva', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: true } } });
        const result = await setGroupVisible(UUID1, false);
        expect(result!.visible).toBe(false);
        expect(result!.on).toBe(false);
    });

    it('muestra grupo (elimina visible)', async () => {
        await seedStorage({ g: { [UUID1]: { name: 'G', on: false, visible: false } } });
        const result = await setGroupVisible(UUID1, true);
        expect(result!.visible).toBeUndefined();
    });

    it('devuelve null si grupo no existe', async () => {
        await seedStorage();
        const result = await setGroupVisible(UUID1, false);
        expect(result).toBeNull();
    });
});
