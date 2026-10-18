// Owns the eye intro video's loading so the AI mode controller can wait until
// it can play smoothly before showing it (a buffering intro looks frozen).

export const INTRO_VIDEO = {
  hd: '/media/eye-1080.mp4', // 5.6 MB
  sd: '/media/eye-720.mp4', // 2.3 MB, phones and slow connections
  poster: '/media/eye-poster.jpg',
  /**
   * The files have the original clip's 1.6x speed baked in at a steady 30 fps
   * (decoding 38 fps at playbackRate 1.6 made the busy tunnel shots stutter).
   * Clip time = video time x clipSpeed. They end on the clip's white flash.
   */
  clipSpeed: 1.6,
  playbackRate: 1,
};

let element: HTMLVideoElement | null = null;

export function registerIntroVideo(video: HTMLVideoElement | null) {
  element = video;
}

export function getIntroVideo(): HTMLVideoElement | null {
  return element;
}

function slowConnection(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData) || /(^|-)(2g|3g)$/.test(connection?.effectiveType ?? '');
}

export function pickIntroSource(): string {
  const small = window.matchMedia?.('(max-width: 767px)').matches === true;
  return small || slowConnection() ? INTRO_VIDEO.sd : INTRO_VIDEO.hd;
}

/** Start downloading the intro (called the moment AI mode is entered). */
export function preloadIntro() {
  const video = element;
  if (!video || video.getAttribute('src')) return;
  video.preload = 'auto';
  video.src = pickIntroSource();
  video.load();
}

/**
 * Resolves true once the intro can play through without stalling, or false if
 * it isn't ready within `timeoutMs` (the caller then skips the intro).
 */
export function waitForIntro(timeoutMs: number): Promise<boolean> {
  const video = element;
  if (!video || !video.getAttribute('src')) return Promise.resolve(false);
  if (video.readyState >= 4) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeEventListener('canplaythrough', onReady);
      video.removeEventListener('error', onError);
      resolve(ok);
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);
    // HAVE_FUTURE_DATA at the deadline is enough to start; HAVE_METADATA or less is not.
    const timer = window.setTimeout(() => finish(video.readyState >= 3), timeoutMs);
    video.addEventListener('canplaythrough', onReady);
    video.addEventListener('error', onError);
  });
}

/** Stop and drop the download (on exit), so it never keeps using data. */
export function releaseIntro() {
  const video = element;
  if (!video || !video.getAttribute('src')) return;
  video.pause();
  video.removeAttribute('src');
  video.load();
}
