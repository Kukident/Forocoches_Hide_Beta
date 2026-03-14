import { logger } from '@/components/utils/logger';

export const VIDEO_EXTENSIONS = ['.webm', '.mp4', '.ogg', '.ogv'];

export function getVideoMime(pathname: string): string | null {
  if (pathname.endsWith('.webm')) return 'video/webm';
  if (pathname.endsWith('.mp4'))  return 'video/mp4';
  if (pathname.endsWith('.ogg') || pathname.endsWith('.ogv'))  return 'video/ogg';
  return null;
}

export function embedVideos(): void {
  const postBodies = document.querySelectorAll('[id^="post_message_"]');

  let videosEmbebidos = 0;

  postBodies.forEach((container) => {
    const links = container.querySelectorAll('a');
    links.forEach((link) => {
      let pathname: string;
      try {
        pathname = new URL(link.href).pathname.toLowerCase();
      } catch { return; }
      if (!VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext))) return;

      const videoUrl = link.href;
      const video = document.createElement('video');
      video.muted = false;
      video.controls = true;
      video.preload = 'metadata';
      video.setAttribute('referrerpolicy', 'no-referrer');
      video.style.cssText = 'display:block; margin:0 auto; max-width:100%; max-height:600px;';
      video.dataset.fcWebm = '1';
      video.src = videoUrl;

      // Si falla la carga, restaurar el enlace original
      video.addEventListener('error', () => {
        video.style.display = 'none';
        link.style.display = '';
      }, { once: true });

      // Insertar video despues del link y ocultar el link (no reemplazar)
      link.style.display = 'none';
      link.insertAdjacentElement('afterend', video);
      videosEmbebidos++;
    });
  });

  if (videosEmbebidos === 0) return;
  logger.info(`${videosEmbebidos} video(s) embebidos`);
}
