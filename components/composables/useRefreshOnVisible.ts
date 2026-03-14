import { onMounted, onUnmounted } from 'vue';

/**
 * Ejecuta `callback` en onMounted y cada vez que la pestaña vuelve a ser visible.
 * Cubre el caso de datos modificados desde el popup u otro contexto mientras
 * la página de opciones estaba en segundo plano.
 */
export function useRefreshOnVisible(callback: () => void | Promise<void>) {
  let handler: (() => void) | null = null;

  onMounted(() => {
    callback();
    handler = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', handler);
  });

  onUnmounted(() => {
    if (handler) document.removeEventListener('visibilitychange', handler);
  });
}
