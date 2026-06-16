/**
 * 7 维权限校验服务
 *
 * 决策顺序(纵深防御):
 *   1 TenantScope → 2 RBAC → 3 MatterScope → 4 DataLevel
 *   → 5 StageGate → 6 ABAC → 7 ApprovalFlow
 */
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JwtPayload, RoleType, DataLevel, DATA_LEVEL_RANK } from '@lm-unity/shared';

export interface PermissionCheckInput {
  user: JwtPayload;
  action: string;
  resource?: string;
  resourceType?: 'matter' | 'lead' | 'content' | 'product' | 'quote' | 'client';
  dataLevel?: DataLevel;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  /** 触发审批(7 维中第 7 步) */
  requiresApproval?: boolean;
  approverRole?: RoleType;
}

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaClient) {}

  async check(input: PermissionCheckInput): Promise<PermissionCheckResult> {
    // 平台超管享有 wildcard 权限（跨租户、跨案件）
    if (this.isPlatformRole(input.user.role)) {
      // 平台角色在 L6 密级数据上仍受限制（防止 AI 侧泄）
      if (input.dataLevel === DataLevel.L6_AI_RESTRICTED) {
        return {
          allowed: false,
          reason: '平台角色亦不得访问 L6 AI 限制数据',
        };
      }
      return { allowed: true };
    }

    // ② RBAC: 平台前缀动作仅限平台角色
    if (input.action.startsWith('platform:') && !this.isPlatformRole(input.user.role)) {
      return {
        allowed: false,
        reason: `动作 ${input.action} 仅限平台角色`,
      };
    }

    // ① TenantScope:已在 TenantGuard 校验,此处仅记录
    const rbac = this.checkRbac(input.user.role, input.action);
    if (!rbac.allowed) return rbac;

    // ③ MatterScope:具体资源归属
    if (input.resourceType === 'matter' && input.resource) {
      const scope = await this.checkMatterScope(input.user, input.resource);
      if (!scope.allowed) return scope;
    }

    // ④ DataLevel:数据密级校验
    if (input.dataLevel) {
      const dl = this.checkDataLevel(input.user.role, input.dataLevel);
      if (!dl.allowed) return dl;
    }

    // ⑤ / ⑥ / ⑦ StageGate + ABAC + ApprovalFlow 留给后续阶段
    return { allowed: true };
  }

  /** 平台角色(超管/运营/合规/技术支持)享有跨租户通行 */
  private isPlatformRole(role: RoleType): boolean {
    return role.startsWith('PLATFORM_');
  }

  /** 2 RBAC 角色 × 动作矩阵(简化版,生产应存数据库 + 缓存) */
  private checkRbac(role: RoleType, action: string): PermissionCheckResult {
    // 律师交付主体角色
    const lawyerRoles: RoleType[] = [
      RoleType.RESPONSIBLE_PARTNER,
      RoleType.LEAD_LAWYER,
      RoleType.SOLO_LAWYER,
    ];

    // 客户侧: 5.x 客户只读
    const clientRoles: RoleType[] = [
      RoleType.CLIENT_OWNER,
      RoleType.CLIENT_CONTACT,
      RoleType.CLIENT_LEGAL,
      RoleType.CLIENT_FINANCE,
      RoleType.CLIENT_DECISION_MAKER,
      RoleType.INDIVIDUAL_CLIENT,
    ];

    if (clientRoles.includes(role) && !action.endsWith(':read-self')) {
      return { allowed: false, reason: '客户角色无写权限' };
    }

    // 客户敏感操作必须有律师介入
    if (
      lawyerRoles.includes(role) &&
      (action === 'matter:close' || action === 'matter:sign')
    ) {
      // 签字 / 结案需主办律师以上
      if (role === RoleType.LEAD_LAWYER) {
        return {
          allowed: false,
          requiresApproval: true,
          approverRole: RoleType.RESPONSIBLE_PARTNER,
          reason: '需合伙人审批',
        };
      }
    }

    return { allowed: true };
  }

  /** 3 MatterScope:案件归属校验 */
  private async checkMatterScope(
    user: JwtPayload,
    matterId: string,
  ): Promise<PermissionCheckResult> {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: {
        tenantId: true,
        leadLawyerId: true,
        responsiblePartnerId: true,
      },
    });

    if (!matter) {
      return { allowed: false, reason: '案件不存在' };
    }
    if (matter.tenantId !== user.tid) {
      return { allowed: false, reason: '跨租户访问' };
    }
    if (
      user.role !== RoleType.MANAGING_PARTNER &&
      user.role !== RoleType.RESPONSIBLE_PARTNER &&
      matter.leadLawyerId !== user.sub &&
      matter.responsiblePartnerId !== user.sub
    ) {
      return { allowed: false, reason: '案件归属不匹配' };
    }
    return { allowed: true };
  }

  /** 4 DataLevel 数据密级校验(5.2 矩阵的简化版) */
  private checkDataLevel(role: RoleType, required: DataLevel): PermissionCheckResult {
    const maxLevel = this.maxDataLevelForRole(role);
    if (DATA_LEVEL_RANK[required] > DATA_LEVEL_RANK[maxLevel]) {
      return { allowed: false, reason: `数据密级 ${required} 超出角色权限` };
    }
    return { allowed: true };
  }

  private maxDataLevelForRole(role: RoleType): DataLevel {
    if (role === RoleType.INDIVIDUAL_CLIENT || role.startsWith('CLIENT_')) {
      return DataLevel.L4_CLIENT_CONFIDENTIAL;
    }
    if (role === RoleType.OPERATION_USER || role === RoleType.SUPPORT_OPERATOR) {
      return DataLevel.L2_FIRM_INTERNAL;
    }
    if (role === RoleType.LEGAL_ASSISTANT || role === RoleType.INTERN) {
      return DataLevel.L3_MATTER_TEAM;
    }
    if (role === RoleType.ASSOCIATE_LAWYER || role === RoleType.EXTERNAL_LAWYER) {
      return DataLevel.L4_CLIENT_CONFIDENTIAL;
    }
    // 合伙人 / 主办律师 / 独立律师 / 风控合伙人
    return DataLevel.L5_HIGHLY_CONFIDENTIAL;
  }
}
