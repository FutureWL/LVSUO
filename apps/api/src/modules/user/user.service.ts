import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { User, CreateUserInput, RoleType } from '@lm-unity/shared';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  async findOne(tenantId: string, id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user as unknown as User;
  }

  async findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, userStatus: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, input: Omit<CreateUserInput, 'tenantId'>) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    return this.prisma.user.create({
      data: {
        tenantId,
        username: input.username,
        mobile: input.mobile,
        email: input.email,
        passwordHash,
        realName: input.realName,
        roleType: input.roleType,
        licenseNo: input.licenseNo,
        userStatus: 'ACTIVE',
      },
    });
  }
}
