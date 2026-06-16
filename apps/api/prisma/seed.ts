/**
 * 平台初始化 Seed 脚本
 * 任务书 4.1 PLATFORM_SUPER_ADMIN
 *
 * 首次部署运行一次:
 *   cd apps/api && npx tsx prisma/seed.ts
 *
 * 重复运行幂等(upsert)
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLATFORM_TENANT_ID = 'platform-root';
const SUPER_ADMIN_USERNAME = 'superadmin';
const SUPER_ADMIN_PASSWORD = 'SuperAdmin@2026!';

async function main() {
  console.log('🌱 平台初始化 seed 开始...\n');

  // 1. 创建 PLATFORM 租户
  const platformTenant = await prisma.tenant.upsert({
    where: { id: PLATFORM_TENANT_ID },
    create: {
      id: PLATFORM_TENANT_ID,
      tenantName: 'PLATFORM',
      tenantType: 'SUPPORT_ORG', // 复用枚举(平台本身是支持型组织)
      deploymentMode: 'SAAS',
      status: 'ACTIVE',
    },
    update: {},
  });
  console.log(`✅ PLATFORM 租户: ${platformTenant.tenantName} (${platformTenant.id})`);

  // 2. 创建首个 PLATFORM_SUPER_ADMIN
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const superAdmin = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: PLATFORM_TENANT_ID,
        username: SUPER_ADMIN_USERNAME,
      },
    },
    create: {
      tenantId: PLATFORM_TENANT_ID,
      username: SUPER_ADMIN_USERNAME,
      passwordHash,
      realName: '系统超管',
      roleType: 'PLATFORM_SUPER_ADMIN',
      userStatus: 'ACTIVE',
    },
    update: {
      // 同步更新密码(便于重复运行重置)
      passwordHash,
      realName: '系统超管',
      userStatus: 'ACTIVE',
    },
  });
  console.log(`✅ 平台超管: ${superAdmin.username} (${superAdmin.roleType})`);
  console.log(`   ⚠️  默认密码: ${SUPER_ADMIN_PASSWORD} (生产环境请立即修改)\n`);

  // 3. 同时也创建一个 PLATFORM_OPERATOR 用于日常运营(可选)
  const operator = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: PLATFORM_TENANT_ID,
        username: 'operator',
      },
    },
    create: {
      tenantId: PLATFORM_TENANT_ID,
      username: 'operator',
      passwordHash: await bcrypt.hash('Operator@2026!', 10),
      realName: '平台运营',
      roleType: 'PLATFORM_OPERATOR',
      userStatus: 'ACTIVE',
    },
    update: {},
  });
  console.log(`✅ 平台运营: ${operator.username} (${operator.roleType}) 密码: Operator@2026!\n`);

  console.log('📊 当前平台状态:');
  const tenantCount = await prisma.tenant.count();
  const userCount = await prisma.user.count();
  console.log(`   - 租户总数: ${tenantCount}`);
  console.log(`   - 用户总数: ${userCount}\n`);

  console.log('🎉 Seed 完成。登录请用:');
  console.log('   租户 ID: platform-root');
  console.log(`   用户名: ${SUPER_ADMIN_USERNAME}`);
  console.log(`   密  码: ${SUPER_ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed 失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
