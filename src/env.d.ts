/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" when the site is hosted statically and reads pre-built files from data/ instead of calling /api. */
  readonly VITE_STATIC_DATA?: string;
}
