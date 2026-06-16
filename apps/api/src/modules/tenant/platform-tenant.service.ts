import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DeploymentMode, TenantType } from '@lm-unity/shared';
import * as bcrypt from 'bcryptjs';

export interface CreateTenantInput {
  tenantName: string;
  tenantType: TenantType;
  deploymentMode: DeploymentMode;
  adminUsername: string;
  adminPassword: string;
  adminRealName: string;
  adminMobile?: string;
  adminEmail?: string;
}

export interface PlatformStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalLeads: number;
  totalMatters: number;
  totalKnowledgeCards: number;
  byType: Record<string, number>;
}

@Injectable()
export class PlatformTenantService {
  constructor(private readonly prisma: PrismaClient) {}

  /** 平台超管:列出所有租户 */
  async listAll(page = 1, pageSize = 20, search?: string) {
    const where = search
      ? { tenantName: { contains: search, mode: 'insensitive' as any } }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { users: true, matters: true, leads: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  /** 平台超管:创建新租户 + 第一个管理员 */
  async create(input: CreateTenantInput) {
    const existing = await this.prisma.tenant.findFirst({
      where: { tenantName: input.tenantName },
    });
    if (existing) {
      throw new ConflictException('租户名称已存在');
    }
    const tenant = await this.prisma.tenant.create({
      data: {
        tenantName: input.tenantName,
        tenantType: input.tenantType,
        deploymentMode: input.deploymentMode,
        status: 'ACTIVE',
      },
    });
    const passwordHash = await bcrypt.hash(input.adminPassword, 10);
    const roleType =
      input.tenantType === TenantType.SOLO ? 'SOLO_LAWYER' : 'FIRM_ADMIN';
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        username: input.adminUsername,
        mobile: input.adminMobile,
        email: input.adminEmail,
        passwordHash,
        realName: input.adminRealName,
        roleType,
        userStatus: 'ACTIVE',
      },
    });
    return { tenant, user };
  }

  /** 平台超管:暂停 / 恢复 / 注销租户 */
  async updateStatus(tenantId: string, status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'DELETED') {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new NotFoundException('租户不存在');
    if (t.tenantName === 'PLATFORM') {
      throw new ConflictException('不能修改 PLATFORM 自身租户');
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });
  }

  /** 平台超管:跨租户统计 */
  async getStats(): Promise<PlatformStats> {
    const [totalTenants, activeTenants, totalUsers, totalLeads, totalMatters, totalKnowledgeCards, byTypeRaw] =
      await this.prisma.$transaction([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count(),
        this.prisma.lead.count(),
        this.prisma.matter.count(),
        this.prisma.knowledgeCard.count(),
        this.prisma.tenant.groupBy({
          by: ['tenantType'],
          _count: { _all: true },
        } as any),
      ]);

    const byType: Record<string, number> = {};
    byTypeRaw.forEach((row: any) => {
      const cnt = row._count;
      byType[row.tenantType] = typeof cnt === 'number' ? cnt : cnt?._all ?? 0;
    });

    return {
      totalTenants,
      activeTenants,
      totalUsers,
      totalLeads,
      totalMatters,
      totalKnowledgeCards,
      byType,
    };
  }
}
