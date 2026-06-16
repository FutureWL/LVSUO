import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtPayload, RoleType, TenantType, DeploymentMode } from '@lm-unity/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 注册租户 + 第一个管理员用户
   * MVP 第一步(14.2 第 1 项:多租户与用户权限)
   */
  async registerTenant(input: {
    tenantName: string;
    tenantType: TenantType;
    deploymentMode: DeploymentMode;
    adminUsername: string;
    adminPassword: string;
    adminRealName: string;
    adminMobile?: string;
    adminEmail?: string;
  }) {
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
      input.tenantType === TenantType.SOLO
        ? RoleType.SOLO_LAWYER
        : RoleType.FIRM_ADMIN;

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

  /**
   * 登录
   */
  async login(tenantId: string, username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        username,
        userStatus: 'ACTIVE',
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload: JwtPayload = {
      sub: user.id,
      tid: user.tenantId,
      role: user.roleType as RoleType,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.roleType,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * 刷新 token
   */
  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.userStatus !== 'ACTIVE') {
        throw new UnauthorizedException('用户已禁用');
      }
      const newPayload: JwtPayload = {
        sub: user.id,
        tid: user.tenantId,
        role: user.roleType as RoleType,
      };
      return { accessToken: this.jwt.sign(newPayload) };
    } catch {
      throw new UnauthorizedException('Refresh token 无效');
    }
  }
}
