import { ref, computed, type Ref, type ComputedRef } from 'vue';
import http from '@/api/http';

export interface UseTableOptions {
  /** 后端分页接口路径,如 '/leads' */
  url: string;
  /** 每页条数,默认 20 */
  pageSize?: number;
}

export interface UseTableReturn<T> {
  items: Ref<T[]>;
  total: Ref<number>;
  page: Ref<number>;
  pageSize: Ref<number>;
  loading: Ref<boolean>;
  /** 加载完成且无数据 */
  empty: ComputedRef<boolean>;
  /** 拉当前页;extras 会 merge 进 query params(空值/null/undefined 自动剔除) */
  load: (extras?: Record<string, any>) => Promise<void>;
  /** 不带 extras 重拉当前页 */
  reload: () => Promise<void>;
  /** page 回 1 后拉取,常用于搜索/筛选/重置 */
  resetAndLoad: (extras?: Record<string, any>) => Promise<void>;
}

/**
 * 通用列表 composable —— 封装分页 + loading + 空态 + 搜索/筛选合并
 *
 * 约定: 后端 GET <url>?page=&pageSize=&... 返回 PageResponse<T>(见 shared)
 *
 * 用法:
 *   const table = useTable<Lead>({ url: '/leads' });
 *   onMounted(() => table.resetAndLoad({ keyword: 'foo' }));
 *
 *   // 模板里: v-loading="table.loading" :data="table.items"
 *   //        v-model:current-page="table.page" :total="table.total"
 *   //        <TableEmpty v-if="table.empty" />
 */
export function useTable<T = unknown>(options: UseTableOptions): UseTableReturn<T> {
  const items = ref<T[]>([]) as Ref<T[]>;
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(options.pageSize ?? 20);
  const loading = ref(false);
  const empty = computed(() => !loading.value && items.value.length === 0);

  async function load(extras: Record<string, any> = {}) {
    loading.value = true;
    try {
      const params: { page: number; pageSize: number; [k: string]: any } = {
        page: page.value,
        pageSize: pageSize.value,
      };
      for (const [k, v] of Object.entries(extras)) {
        if (v !== '' && v !== null && v !== undefined) params[k] = v;
      }
      const res = await http.page<T>(options.url, params);
      items.value = res.items;
      total.value = res.total;
    } finally {
      loading.value = false;
    }
  }

  async function reload() {
    await load();
  }

  async function resetAndLoad(extras: Record<string, any> = {}) {
    page.value = 1;
    await load(extras);
  }

  return { items, total, page, pageSize, loading, empty, load, reload, resetAndLoad };
}
