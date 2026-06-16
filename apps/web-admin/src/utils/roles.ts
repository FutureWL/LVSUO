/**
 * 角色判断工具
 *  - isPlatformRole(role): 是否平台角色(以 PLATFORM_ 开头)
 *  - 抽出为纯函数便于单测,路由守卫 / 菜单渲染复用
 */
export function isPlatformRole(role: string | null | undefined): boolean {
  return !!role && role.startsWith('PLATFORM_');
}
