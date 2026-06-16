import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';
import { classifyError } from '@/utils/error';
import type { PageResponse } from '@lm-unity/shared';

// baseURL 优先级: VITE_API_BASE > BASE_URL+'/api' > '/api'
// 与 nginx 的 /lvsuo/api/ 位置配合,由 nginx rewrite 拼上 /api/counsel/v1
function resolveBaseURL(): string {
  const explicit = import.meta.env.VITE_API_BASE;
  if (explicit) return explicit;
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/+$/, '')}/api`;
}

const instance: AxiosInstance = axios.create({
  baseURL: resolveBaseURL(),
  timeout: 30000,
});

// ============ 请求拦截器:注入 JWT ============
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.set('Authorization', `Bearer ${auth.token}`);
  }
  return config;
});

// ============ 响应拦截器 ============
// 成功:返回 res.data(响应体)
// 失败:按错误分类处理
//  - unauthorized (401): 清登录态 + 跳登录
//  - 其它: 弹 toast(由调用方按业务 code 再分支,如 LEAD_NOT_FOUND)
instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const cls = classifyError(err);

    if (cls.kind === 'unauthorized') {
      const auth = useAuthStore();
      auth.clear();
      if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' });
      }
      // 401 不弹 toast,跳登录已是明确动作
      return Promise.reject(err);
    }

    // 其它错误统一 toast(ElMessage 已对 1s 内的相同消息做合并)
    ElMessage.error(cls.message);
    return Promise.reject(err);
  },
);

/**
 * 包装后的 http 客户端
 * - post<T>: 直接返回 T(响应体),而非 AxiosResponse<T>
 * - get<T>: 同上
 */
const http = {
  get<T = unknown>(url: string, params?: any): Promise<T> {
    return instance.get<T, T>(url, { params });
  },
  post<T = unknown>(url: string, data?: any): Promise<T> {
    return instance.post<T, T>(url, data);
  },
  put<T = unknown>(url: string, data?: any): Promise<T> {
    return instance.put<T, T>(url, data);
  },
  delete<T = unknown>(url: string, params?: any): Promise<T> {
    return instance.delete<T, T>(url, { params });
  },
  patch<T = unknown>(url: string, data?: any): Promise<T> {
    return instance.patch<T, T>(url, data);
  },
  /**
   * 分页请求便捷方法。后端约定：GET <url>?page=&pageSize= → PageResponse<T>
   *  示例: const { items, total } = await http.page<Lead>('/leads', { page: 1, pageSize: 20 })
   */
  page<T = unknown>(url: string, params: { page: number; pageSize: number; [k: string]: any }): Promise<PageResponse<T>> {
    return instance.get<PageResponse<T>, PageResponse<T>>(url, { params });
  },
};

export default http;
