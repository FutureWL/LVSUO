import axios, { type AxiosInstance } from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';
import router from '@/router';

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/counsel/v1',
  timeout: 30000,
});

http.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const data = err.response?.data;
    if (status === 401) {
      const auth = useAuthStore();
      auth.clear();
      router.push({ name: 'login' });
    }
    const message = data?.message || err.message || '请求失败';
    ElMessage.error(message);
    return Promise.reject(err);
  },
);

export default http;
