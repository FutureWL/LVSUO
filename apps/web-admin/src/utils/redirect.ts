/**
 * Login 重定向目标解析 —— 防开放重定向
 *  规则: query.redirect 以 '/' 开头 → 使用(内部路径)
 *  其他(包含 http://、//、空、缺省)→ 回 /dashboard
 *  目的:不能被诱导到外站或执行 javascript: 伪协议
 *  抽出为独立文件便于单测
 */
export function resolveRedirectTarget(query: Record<string, any> | undefined): string {
  const raw = query?.redirect;
  // 防开放重定向: 必须是字符串,以 / 开头,但不是 //(protocol-relative)
  if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
    return raw;
  }
  return '/dashboard';
}
