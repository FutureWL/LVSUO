import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'node:path';

/**
 * vitest 配置
 *  - environment: node 优先(纯函数测试不需要 DOM);后续 component 测试切 happy-dom
 *  - include: src/**\/*.{test,spec}.ts
 *  - globals: false,显式 import { describe, it, expect } from 'vitest' 更清晰
 *  - 复用 vite 的 vue / auto-import / components 插件(Vue SFC 测试需要)
 *
 * 注:本项目是 Vite 5 + Vitest 2 的标准组合,无特殊配置
 */
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@lm-unity/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    globals: false,
  },
});
