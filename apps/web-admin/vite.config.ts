import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // 部署在 https://wxf-prod.huntercat.cn/lvsuo/ 子路径下
    // 告诉 Vite 所有资源(HMTL/CSS/JS/HMR)都从 /lvsuo/ 出发
    base: env.VITE_BASE_PATH || '/',

    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'auto-imports.d.ts',
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'components.d.ts',
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@lm-unity/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
    server: {
      port: 5173,
      // 允许通过 nginx 反向代理后的公网域名访问 dev server
      allowedHosts: ['wxf-prod.huntercat.cn'],
      proxy: {
        // 1) 直接访问 vite 时的 API 代理
        //    http://localhost:5173/api/... → 后端
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
        // 2) 通过 nginx 子目录代理时的 API 路径
        //    /lvsuo/api/counsel/v1/health → /api/counsel/v1/health
        '/lvsuo/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/lvsuo\/api/, '/api'),
        },
      },
      hmr: {
        overlay: false,
      },
    },
    optimizeDeps: {
      include: [
        'element-plus',
        'element-plus/es/components/message/style/css',
        'element-plus/es/components/notification/style/css',
        'vue',
        'vue-router',
        'pinia',
        'axios',
      ],
    },
  };
});
