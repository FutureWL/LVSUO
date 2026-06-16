<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import http from '@/api/http';

const router = useRouter();
const auth = useAuthStore();

interface TenantInfo {
  id: string;
  tenantName: string;
  tenantType: string;
  deploymentMode: string;
}

const tenant = ref<TenantInfo | null>(null);

onMounted(async () => {
  // 当前用户的租户信息(从后端拉)
  if (auth.user?.tenantId) {
    try {
      // 复用 user 列表接口的第一条(同租户下,任意用户都是同租户)
      // 实际生产应该用专门的 GET /tenants/current
      tenant.value = await http.get<TenantInfo>(`/tenants/${auth.user.tenantId}`);
    } catch {
      // 兜底:用 user 里的 tenantName
    }
  }
});

const roleNameMap: Record<string, string> = {
  // 平台
  PLATFORM_SUPER_ADMIN: '平台超管',
  PLATFORM_OPERATOR: '平台运营',
  PLATFORM_COMPLIANCE: '平台合规',
  PLATFORM_TECH_SUPPORT: '平台技术',
  // 律所
  FIRM_ADMIN: '律所管理员',
  MANAGING_PARTNER: '管理合伙人',
  RISK_PARTNER: '风控合伙人',
  MARKETING_DIRECTOR: '市场负责人',
  CLIENT_SUCCESS_MANAGER: '客户成功',
  KNOWLEDGE_MANAGER: '知识管理员',
  FINANCE_OFFICER: '财务',
  OPERATION_USER: '运营',
  QUALITY_REVIEWER: '质检',
  // 律师
  RESPONSIBLE_PARTNER: '负责合伙人',
  LEAD_LAWYER: '主办律师',
  ASSOCIATE_LAWYER: '协办律师',
  LEGAL_ASSISTANT: '律师助理',
  INTERN: '实习生',
  SOLO_LAWYER: '独立律师',
  EXTERNAL_LAWYER: '外部律师',
  EXPERT_ADVISOR: '外部专家',
  // 客户
  CLIENT_OWNER: '客户主联系人',
  CLIENT_CONTACT: '客户联系人',
  CLIENT_LEGAL: '客户法务',
  CLIENT_FINANCE: '客户财务',
  CLIENT_DECISION_MAKER: '客户决策人',
  INDIVIDUAL_CLIENT: '个人客户',
  // 支持企业
  SUPPORT_ORG_ADMIN: '支持企业管理',
  SUPPORT_OPERATOR: '支持运营',
  SUPPORT_QA: '支持质检',
  SUPPORT_DATA_ANALYST: '支持数据分析',
};

const roleName = computed(() => {
  const r = auth.user?.role;
  return r ? roleNameMap[r] || r : '';
});

const isPlatformRole = computed(() => auth.user?.role?.startsWith('PLATFORM_') ?? false);

const onLogout = () => {
  auth.clear();
  router.push({ name: 'login' });
};

const onGoPlatformConsole = () => {
  router.push('/platform');
};
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" style="background: #001529; color: #fff">
      <div style="padding: 20px; font-size: 18px; font-weight: bold; text-align: center">
        智法云枢
      </div>
      <el-menu
        :default-active="$route.path"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#1890ff"
        router
      >
        <el-menu-item index="/dashboard">
          <span>总览驾驶舱</span>
        </el-menu-item>
        <el-menu-item index="/leads">
          <span>线索看板</span>
        </el-menu-item>
        <el-menu-item index="/clients">
          <span>客户中心</span>
        </el-menu-item>
        <el-menu-item index="/products">
          <span>服务产品库</span>
        </el-menu-item>
        <el-menu-item index="/quotes">
          <span>报价卡</span>
        </el-menu-item>
        <el-menu-item index="/matters">
          <span>案件看板</span>
        </el-menu-item>
        <el-menu-item v-if="isPlatformRole" index="/platform">
          <span style="color: #fa8c16">⚡ 平台控制台</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header
        style="background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between; padding: 0 24px"
      >
        <!-- 左:面包屑 / 当前页 -->
        <div style="font-size: 16px; font-weight: 500">
          {{ $route.meta.title || '智法云枢' }}
        </div>

        <!-- 中:租户徽章(平台管理员看得到自己的平台租户) -->
        <div style="display: flex; align-items: center; gap: 12px">
          <el-tag
            v-if="tenant"
            :type="isPlatformRole ? 'warning' : 'primary'"
            effect="dark"
            round
            size="large"
          >
            🏢 {{ tenant.tenantName }}
          </el-tag>
          <el-tag v-else-if="auth.user" type="info" effect="plain" round>
            🏢 {{ auth.user.tenantId.slice(0, 8) }}…
          </el-tag>

          <el-tag v-if="roleName" size="small" effect="plain">
            {{ roleName }}
          </el-tag>
        </div>

        <!-- 右:用户菜单 -->
        <div>
          <el-dropdown @command="(c: string) => c === 'logout' ? onLogout() : c === 'platform' ? onGoPlatformConsole() : null">
            <span style="cursor: pointer; display: flex; align-items: center; gap: 8px">
              <el-avatar :size="32" style="background: #1890ff">
                {{ (auth.user?.realName || '?').slice(0, 1) }}
              </el-avatar>
              <span>{{ auth.user?.realName || '未登录' }}</span>
              <el-icon><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  {{ auth.user?.username }} @ {{ auth.user?.tenantId.slice(0, 12) }}…
                </el-dropdown-item>
                <el-dropdown-item v-if="isPlatformRole" command="platform" divided>
                  ⚡ 平台控制台
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main style="background: #f5f7fa">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>
