import { describe, it, expect } from 'vitest';
import { seedStorage, readAllLocal } from './setup';
import {
    readLocalData,
    writeLocalData,
    normalize,
    META_KEY,
    FORUM_KEY_PREFIX,
    GROUP_KEY_PREFIX,
    USERS_KEY,
    IGNORED_KEY,
    type FcData,
} from '@/components/hideThreads/storageUtils';
import { setMemCache } from '@/components/hideThreads/_internal';

const UUID1 = '00000000-0000-0000-0000-000000000001';

// ─── readLocalData ──────────────────────────────────────────────────────────

describe('readLocalData', () => {
    it('lee layout v1 indexado', async () => {
        await seedStorage({
            f: { '2': { w: ['test'] }, '17': { u: ['user1'] } },
        });
        const data = await readLocalData();
        expect(data.v).toBe(1);
        expect(data.f['2'].w).toEqual(['test']);
        expect(data.f['17'].u).toEqual(['user1']);
    });

    it('cache hit en segunda lectura', async () => {
        await seedStorage({ f: { '2': { w: ['test'] } } });
        const first = await readLocalData();
        const second = await readLocalData();
        expect(second).toBe(first); // same reference
    });

    it('lee users y ignored', async () => {
        await seedStorage({
            users: { 'vip1': { note: 'hi' } },
            ignored: ['troll1'],
        });
        const data = await readLocalData();
        expect(data.users!['vip1'].note).toBe('hi');
        expect(data.ignored).toEqual(['troll1']);
    });

    it('lee grupos', async () => {
        await seedStorage({
            g: { [UUID1]: { name: 'G1', on: true, w: ['word1'] } },
        });
        const data = await readLocalData();
        expect(data.g![UUID1].name).toBe('G1');
        expect(data.g![UUID1].w).toEqual(['word1']);
    });

    it('fallback a vacio si no hay datos', async () => {
        const data = await readLocalData();
        expect(data.v).toBe(1);
        expect(data.s.active).toBe(true);
        expect(data.f).toEqual({});
    });

    it('persiste fc_meta en primer run', async () => {
        await readLocalData();
        const all = readAllLocal();
        expect(all[META_KEY]).toBeDefined();
        expect(all[META_KEY].v).toBe(1);
    });

    it('invalida cache tras storage change', async () => {
        await seedStorage({ f: { '2': { w: ['old'] } } });
        const first = await readLocalData();
        expect(first.f['2'].w).toEqual(['old']);

        // Simulate external write + cache invalidation
        setMemCache(null);
        await seedStorage({ f: { '2': { w: ['new'] } } });
        const second = await readLocalData();
        expect(second.f['2'].w).toEqual(['new']);
    });
});

// ─── writeLocalData ─────────────────────────────────────────────────────────

describe('writeLocalData', () => {
    it('escribe meta + fc_f_* + fc_g_*', async () => {
        const data = normalize({
            f: { '2': { w: ['word1'] } },
            g: { [UUID1]: { name: 'G1', on: false } },
        });
        await writeLocalData(data);
        const all = readAllLocal();
        expect(all[META_KEY].v).toBe(1);
        expect(all[META_KEY].fids).toEqual(['2']);
        expect(all[META_KEY].gids).toEqual([UUID1]);
        expect(all[`${FORUM_KEY_PREFIX}2`].w).toEqual(['word1']);
        expect(all[`${GROUP_KEY_PREFIX}${UUID1}`].name).toBe('G1');
    });

    it('escribe fc_users y fc_ignored', async () => {
        const data = normalize({
            users: { 'vip1': { note: 'hi' } },
            ignored: ['troll'],
        });
        await writeLocalData(data);
        const all = readAllLocal();
        expect(all[USERS_KEY]).toEqual({ 'vip1': { note: 'hi' } });
        expect(all[IGNORED_KEY]).toEqual(['troll']);
    });

    it('elimina huerfanos basado en memCache anterior', async () => {
        // First write establishes memCache with forum 2
        const data1 = normalize({ f: { '2': { w: ['old'] } } });
        await writeLocalData(data1);
        expect(readAllLocal()[`${FORUM_KEY_PREFIX}2`]).toBeDefined();

        // Second write without forum 2 — orphan removal diffs against memCache
        const data2 = normalize({ f: { '17': { w: ['new'] } } });
        await writeLocalData(data2);
        const all = readAllLocal();
        expect(all[`${FORUM_KEY_PREFIX}2`]).toBeUndefined();
        expect(all[`${FORUM_KEY_PREFIX}17`].w).toEqual(['new']);
    });

    it('actualiza memCache', async () => {
        const data = normalize({ f: { '2': { w: ['test'] } } });
        await writeLocalData(data);
        // Verify cache by reading (should be cache hit)
        const result = await readLocalData();
        expect(result.f['2'].w).toEqual(['test']);
    });

    it('no escribe fids/gids vacios en meta', async () => {
        const data = normalize();
        await writeLocalData(data);
        const all = readAllLocal();
        expect(all[META_KEY].fids).toBeUndefined();
        expect(all[META_KEY].gids).toBeUndefined();
    });
});
