import { describe, it, expect } from 'vitest';
import { seedStorage, readAllSync } from './setup';
import {
    packToSync,
    unpackFromSync,
    normalize,
    SYNC_META_KEY,
    SYNC_CHUNK_PREFIX,
    type FcData,
} from '@/components/hideThreads/storageUtils';
import { setLastPackedHash } from '@/components/hideThreads/_internal';

// ─── packToSync ─────────────────────────────────────────────────────────────

describe('packToSync', () => {
    it('comprime y escribe chunks', async () => {
        const data = normalize({ f: { '2': { w: ['test'] } } });
        const result = await packToSync(data);
        expect(result).not.toBeNull();
        expect(result!.chunks).toBeGreaterThanOrEqual(1);

        const sync = readAllSync();
        expect(sync[SYNC_META_KEY]).toBeDefined();
        expect(sync[SYNC_META_KEY].schema).toBe(1);
        expect(sync[`${SYNC_CHUNK_PREFIX}0`]).toBeDefined();
    });

    it('skip cuando hash sin cambios', async () => {
        const data = normalize({ f: { '2': { w: ['test'] } } });
        const first = await packToSync(data);
        expect(first).not.toBeNull();

        const second = await packToSync(data);
        expect(second).toBeNull();
    });

    it('escribe deviceId en meta', async () => {
        const data = normalize({ f: { '2': { w: ['test'] } } });
        await packToSync(data);
        const sync = readAllSync();
        expect(sync[SYNC_META_KEY].deviceId).toBeDefined();
        expect(typeof sync[SYNC_META_KEY].deviceId).toBe('string');
    });

    it('re-escribe si datos cambian', async () => {
        const data1 = normalize({ f: { '2': { w: ['first'] } } });
        await packToSync(data1);

        const data2 = normalize({ f: { '2': { w: ['second'] } } });
        const result = await packToSync(data2);
        expect(result).not.toBeNull();
    });
});

// ─── unpackFromSync ─────────────────────────────────────────────────────────

describe('unpackFromSync', () => {
    it('descomprime chunks → FcData', async () => {
        const data = normalize({
            f: { '2': { w: ['hello', 'world'] } },
            users: { 'vip1': { note: 'test' } },
        });
        await packToSync(data);

        // Reset hash to allow re-read
        setLastPackedHash(null);

        const result = await unpackFromSync();
        expect(result).not.toBeNull();
        expect(result!.v).toBe(1);
        expect(result!.f['2'].w).toEqual(['hello', 'world']);
        expect(result!.users!['vip1'].note).toBe('test');
    });

    it('null si no hay meta', async () => {
        const result = await unpackFromSync();
        expect(result).toBeNull();
    });

    it('roundtrip con grupos', async () => {
        const uuid = '12345678-1234-1234-1234-123456789abc';
        const data = normalize({
            g: { [uuid]: { name: 'Test', on: true, w: ['word1'], type: 'hide' } },
        });
        await packToSync(data);
        setLastPackedHash(null);

        const result = await unpackFromSync();
        expect(result).not.toBeNull();
        expect(result!.g![uuid].name).toBe('Test');
        expect(result!.g![uuid].w).toEqual(['word1']);
    });

    it('roundtrip con ignored', async () => {
        const data = normalize({ ignored: ['troll1', 'troll2'] });
        await packToSync(data);
        setLastPackedHash(null);

        const result = await unpackFromSync();
        expect(result).not.toBeNull();
        expect(result!.ignored).toEqual(['troll1', 'troll2']);
    });
});
