/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'element-plus/dist/locale/zh-cn.mjs';
declare module 'element-plus/dist/locale/en.mjs';
