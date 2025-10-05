declare module 'virtual:pwa-register' {
  export type UpdateSW = (reloadPage?: boolean) => Promise<void>;

  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }

  export function registerSW(options?: RegisterSWOptions): UpdateSW | undefined;
}

declare module 'vite-plugin-pwa' {
  import type { PluginOption } from 'vite';

  export type RuntimeCachingHandler =
    | 'CacheFirst'
    | 'NetworkFirst'
    | 'NetworkOnly'
    | 'CacheOnly'
    | 'StaleWhileRevalidate';

  export interface RuntimeCachingEntry {
    urlPattern:
      | RegExp
      | string
      | ((context: { url: URL; request: Request; event: ExtendableEvent }) => boolean);
    handler: RuntimeCachingHandler;
    method?: 'GET' | 'POST';
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      cacheableResponse?: {
        statuses?: number[];
        headers?: Record<string, string>;
      };
    };
  }

  export interface VitePWAOptions {
    base?: string;
    registerType?: 'autoUpdate' | 'prompt';
    injectRegister?: 'auto' | 'script' | 'inline' | null | false;
    includeAssets?: string[];
    manifest?: Record<string, unknown>;
    workbox?: {
      globPatterns?: string[];
      cleanupOutdatedCaches?: boolean;
      runtimeCaching?: RuntimeCachingEntry[];
    };
    devOptions?: {
      enabled?: boolean;
      type?: 'module' | 'classic';
      navigateFallback?: string;
    };
  }

  export function VitePWA(options?: VitePWAOptions): PluginOption;
}
