import type { PageResponse } from '@lm-unity/shared';

/**
 * 构造分页响应 —— 让 service 保持显式的 findMany+count 调用(语义清晰),
 * 但返回类型统一为 PageResponse<T>,前端可直接用泛型
 *
 * 用法:
 *   const [items, total] = await this.prisma.$transaction([...]);
 *   return buildPage(items, total, page, pageSize);
 */
export function buildPage<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PageResponse<T> {
  return { items, total, page, pageSize };
}
