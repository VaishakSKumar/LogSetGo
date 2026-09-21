import { Platform } from 'react-native';

/**
 * Web only, production builds only: registers the service worker that caches the app for offline use.
 * Registered relative to the page (`sw.js`), so it also works when hosted under a sub-path.
 * Failure is harmless: the app just runs online-only.
 */
export function registerServiceWorker() {
  if (Platform.OS !== 'web' || process.env.NODE_ENV !== 'production') return;
  const nav = typeof navigator !== 'undefined' ? (navigator as Navigator) : undefined;
  if (!nav || !('serviceWorker' in nav)) return;

  const register = () => {
    nav.serviceWorker.register('sw.js').catch(() => {});
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
