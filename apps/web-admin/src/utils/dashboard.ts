/**
 * Dashboard 6 路响应的 stat 装配
 *  - paginated 端点(leads/matters/clients/quotes)取 total
 *  - list 端点(products/cards)取 length
 *  - undefined / 空 → 0(防御)
 *  抽出为独立文件便于单测
 */
export interface DashboardResponses {
  leads: { total?: number };
  matters: { total?: number };
  products: unknown[];
  cards: unknown[];
  clients: { total?: number };
  quotes: { total?: number };
}

export function buildDashboardStats(r: DashboardResponses) {
  return {
    leads: r.leads.total ?? 0,
    matters: r.matters.total ?? 0,
    products: r.products.length ?? 0,
    cards: r.cards.length ?? 0,
    clients: r.clients.total ?? 0,
    quotes: r.quotes.total ?? 0,
  };
}
