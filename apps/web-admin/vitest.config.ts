import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

/**
 * vitest 配置(精简版,不引入 AutoImport / unplugin-vue-components)
 *  - environment: node 优先(纯函数测试不需要 DOM);后续 component 测试切 happy-dom
 *  - globals: false,显式 import { describe, it, expect } from 'vitest' 更清晰
 *  - 只用 vue 插件(Vue SFC 测试需要)
 *
 * CSS / element-plus 问题:
 *  - element-plus 引入的 .css 在 node/happy-dom 下报 'Unknown file extension'
 *  - vitest.setup.ts 用 vi.mock 整个 'element-plus' 包 + stub 替身
 *  - 不再需要 AutoImport / Components 插件(它们在 dev/build 才有意义)
 *  - 这样 .vue 文件里的 <el-button> 等会拿不到, 走 stub
 */
export default defineConfig({
  plugins: [vue()],
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
    css: false,
    setupFiles: ['./vitest.setup.ts'],
  },
});
