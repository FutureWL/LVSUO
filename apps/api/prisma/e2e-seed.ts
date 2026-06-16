/**
 * E2E 测试数据 seed
 *  - 创建 e2e 租户 + 管理员
 *  - 幂等(upsert),可重跑
 *
 * 运行: cd apps/api && npx tsx prisma/e2e-seed.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const E2E_TENANT_ID = 'e2e-tenant';
const E2E_USERNAME = 'e2e-admin';
const E2E_PASSWORD = 'E2eTest12345678';

async function main() {
  console.log('🌱 E2E seed 开始...\n');

  // 1. E2E 租户
  const tenant = await prisma.tenant.upsert({
    where: { id: E2E_TENANT_ID },
    create: {
      id: E2E_TENANT_ID,
      tenantName: 'E2E 测试租户',
      tenantType: 'FIRM',
      deploymentMode: 'SAAS',
      status: 'ACTIVE',
    },
    update: {},
  });
  console.log(`✅ E2E 租户: ${tenant.tenantName} (${tenant.id})`);

  // 2. E2E 管理员
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: {
      tenantId_username: { tenantId: E2E_TENANT_ID, username: E2E_USERNAME },
    },
    create: {
      tenantId: E2E_TENANT_ID,
      username: E2E_USERNAME,
      passwordHash,
      realName: 'E2E 管理员',
      roleType: 'FIRM_ADMIN',
      userStatus: 'ACTIVE',
    },
    update: {
      passwordHash,
      realName: 'E2E 管理员',
      userStatus: 'ACTIVE',
    },
  });
  console.log(`✅ E2E 管理员: ${user.username} (${user.id})`);
  console.log(`\n登录:`);
  console.log(`  tenantId: ${E2E_TENANT_ID}`);
  console.log(`  username: ${E2E_USERNAME}`);
  console.log(`  password: ${E2E_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('seed 失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
