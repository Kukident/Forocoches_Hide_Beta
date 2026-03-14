import { defineConfig } from 'wxt';

export default defineConfig({
    modules: ['@wxt-dev/module-vue'],
    manifest: {
        name: 'Forocoches+',
        short_name: 'Forocoches+',
        version: '1.1.3',
        description: 'Bloquea los hilos que no te interesen de cualquier subforo de Forocoches.',
        permissions: [
            'storage',
            'tabs',
            'alarms',
        ],
        host_permissions: [
            '*://forocoches.com/foro/profile.php*',
        ],
        icons: {
            16: 'icon/16.png',
            32: 'icon/32.png',
            48: 'icon/48.png',
            96: 'icon/96.png',
            128: 'icon/128.png',
        },
        action: {
            default_icon: {
                16: 'icon/16.png',
                32: 'icon/32.png',
                48: 'icon/48.png',
                96: 'icon/96.png',
                128: 'icon/128.png',
            },
        },
        minimum_chrome_version: '109',
        browser_specific_settings: {
            gecko: {
                id: '{d1e0aceb-e8a6-47c3-9fc9-31e314a4a296}',
                strict_min_version: '109.0',
                // @ts-expect-error — Firefox-specific field not in WXT's gecko type
                data_collection_permissions: {
                    required: ['none'],
                },
            },
        },
    },
});
