import { describe, it, expect } from 'vitest';
import { getVideoMime, VIDEO_EXTENSIONS } from '@/components/posts/videoEmbed';

describe('getVideoMime', () => {
    it('.webm devuelve video/webm', () => {
        expect(getVideoMime('/video/test.webm')).toBe('video/webm');
    });

    it('.mp4 devuelve video/mp4', () => {
        expect(getVideoMime('/video/test.mp4')).toBe('video/mp4');
    });

    it('.ogg devuelve video/ogg', () => {
        expect(getVideoMime('/video/test.ogg')).toBe('video/ogg');
    });

    it('.ogv devuelve video/ogg', () => {
        expect(getVideoMime('/video/test.ogv')).toBe('video/ogg');
    });

    it('extension desconocida devuelve null', () => {
        expect(getVideoMime('/video/test.avi')).toBeNull();
    });

    it('sin extension devuelve null', () => {
        expect(getVideoMime('/video/test')).toBeNull();
    });
});

describe('VIDEO_EXTENSIONS', () => {
    it('contiene las extensiones esperadas', () => {
        expect(VIDEO_EXTENSIONS).toContain('.webm');
        expect(VIDEO_EXTENSIONS).toContain('.mp4');
        expect(VIDEO_EXTENSIONS).toContain('.ogg');
        expect(VIDEO_EXTENSIONS).toContain('.ogv');
    });
});
