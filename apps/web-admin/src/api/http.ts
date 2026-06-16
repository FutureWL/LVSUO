import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/counsel/v1',
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
// 失败:统一处理错误,弹 toast,401 跳登录
instance.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status as number | undefined;
    const data = err.response?.data as { message?: string; code?: string } | undefined;
    const message = data?.message || err.message || '请求失败';

    if (status === 401) {
      const auth = useAuthStore();
      auth.clear();
      if (router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login' });
      }
    } else {
      ElMessage.error(message);
    }

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
};

export default http;
