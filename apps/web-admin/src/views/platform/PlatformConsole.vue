<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import http from '@/api/http';

interface Stats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalLeads: number;
  totalMatters: number;
  totalKnowledgeCards: number;
  byType: Record<string, number>;
}

interface Tenant {
  id: string;
  tenantName: string;
  tenantType: string;
  deploymentMode: string;
  status: string;
  createdAt: string;
  _count?: { users: number; matters: number; leads: number };
}

const stats = ref<Stats | null>(null);
const tenants = ref<Tenant[]>([]);
const total = ref(0);
const loading = ref(false);
const search = ref('');

const showCreate = ref(false);
const creating = ref(false);
const newTenant = ref({
  tenantName: '',
  tenantType: 'FIRM',
  deploymentMode: 'SAAS',
  adminUsername: '',
  adminPassword: '',
  adminRealName: '',
  adminMobile: '',
  adminEmail: '',
});

const loadStats = async () => {
  stats.value = await http.get<Stats>('/platform/stats');
};

const loadTenants = async () => {
  loading.value = true;
  try {
    const res: any = await http.get<{ items: Tenant[]; total: number }>(
      `/platform/tenants?page=1&pageSize=50&search=${encodeURIComponent(search.value)}`,
    );
    tenants.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
};

const onCreate = async () => {
  creating.value = true;
  try {
    await http.post('/platform/tenants', newTenant.value);
    ElMessage.success(`已创建租户 ${newTenant.value.tenantName}`);
    showCreate.value = false;
    newTenant.value = {
      tenantName: '',
      tenantType: 'FIRM',
      deploymentMode: 'SAAS',
      adminUsername: '',
      adminPassword: '',
      adminRealName: '',
      adminMobile: '',
      adminEmail: '',
    };
    await loadStats();
    await loadTenants();
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '创建失败');
  } finally {
    creating.value = false;
  }
};

const onToggleStatus = async (row: Tenant) => {
  const next = row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const action = next === 'SUSPENDED' ? '暂停' : '恢复';
  try {
    await ElMessageBox.confirm(
      `确认${action}租户 ${row.tenantName}?`,
      `${action}确认`,
      { type: 'warning' },
    );
    await http.patch(`/platform/tenants/${row.id}/status`, { status: next });
    ElMessage.success(`已${action}`);
    await loadTenants();
  } catch {
    // 取消
  }
};

const typeName: Record<string, string> = {
  FIRM: '律所',
  SOLO: '独立律师',
  TEAM: '律师团队',
  SUPPORT_ORG: '支持企业',
};

onMounted(async () => {
  await Promise.all([loadStats(), loadTenants()]);
});
</script>

<template>
  <div>
    <h2 style="margin-bottom: 4px">⚡ 平台控制台</h2>
    <p style="color: #888; margin-bottom: 24px">
      跨租户视图 · 任务书 4.1 PLATFORM_SUPER_ADMIN
    </p>

    <!-- 跨租户统计 -->
    <el-row v-if="stats" :gutter="16" style="margin-bottom: 24px">
      <el-col :span="4">
        <el-card>
          <div style="font-size: 12px; color: #888">租户总数</div>
          <div style="font-size: 28px; font-weight: bold; color: #1890ff">
            {{ stats.totalTenants }}
          </div>
          <div style="font-size: 12px">活跃: {{ stats.activeTenants }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div style="font-size: 12px; color: #888">用户总数</div>
          <div style="font-size: 28px; font-weight: bold; color: #52c41a">
            {{ stats.totalUsers }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div style="font-size: 12px; color: #888">线索总数</div>
          <div style="font-size: 28px; font-weight: bold">{{ stats.totalLeads }}</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div style="font-size: 12px; color: #888">案件总数</div>
          <div style="font-size: 28px; font-weight: bold; color: #722ed1">
            {{ stats.totalMatters }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div style="font-size: 12px; color: #888">知识卡总数</div>
          <div style="font-size: 28px; font-weight: bold; color: #fa8c16">
            {{ stats.totalKnowledgeCards }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card>
          <div style="font-size: 12px; color: #888">租户类型分布</div>
          <div style="margin-top: 8px">
            <el-tag
              v-for="(count, type) in stats.byType"
              :key="type"
              size="small"
              style="margin-right: 4px; margin-bottom: 4px"
            >
              {{ typeName[type] || type }}: {{ count }}
            </el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 租户列表 -->
    <el-card>
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center">
          <span style="font-weight: bold">租户管理</span>
          <el-space>
            <el-input
              v-model="search"
              placeholder="搜索租户名"
              clearable
              style="width: 240px"
              @keyup.enter="loadTenants"
              @clear="loadTenants"
            />
            <el-button @click="loadTenants">查询</el-button>
            <el-button type="primary" @click="showCreate = true">+ 新建租户</el-button>
          </el-space>
        </div>
      </template>

      <el-table v-loading="loading" :data="tenants" stripe row-key="id">
        <el-table-column prop="tenantName" label="租户名" min-width="160" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ typeName[row.tenantType as keyof typeof typeName] || row.tenantType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="deploymentMode" label="部署" width="120" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : row.status === 'SUSPENDED' ? 'danger' : 'info'"
              size="small"
            >
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户" width="100">
          <template #default="{ row }">{{ row._count?.users || 0 }}</template>
        </el-table-column>
        <el-table-column label="线索" width="100">
          <template #default="{ row }">{{ row._count?.leads || 0 }}</template>
        </el-table-column>
        <el-table-column label="案件" width="100">
          <template #default="{ row }">{{ row._count?.matters || 0 }}</template>
        </el-table-column>
        <el-table-column prop="id" label="ID" width="200">
          <template #default="{ row }">
            <code style="font-size: 11px; color: #888">{{ row.id }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'ACTIVE'"
              size="small"
              type="danger"
              plain
              @click="onToggleStatus(row as Tenant)"
            >
              暂停
            </el-button>
            <el-button
              v-else-if="row.status === 'SUSPENDED'"
              size="small"
              type="success"
              plain
              @click="onToggleStatus(row as Tenant)"
            >
              恢复
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建租户对话框 -->
    <el-dialog v-model="showCreate" title="新建租户" width="560px" :close-on-click-modal="false">
      <el-form :model="newTenant" label-width="100px">
        <el-form-item label="租户名称" required>
          <el-input v-model="newTenant.tenantName" placeholder="如:XX 律师事务所" />
        </el-form-item>
        <el-form-item label="租户类型" required>
          <el-select v-model="newTenant.tenantType" style="width: 100%">
            <el-option label="律所" value="FIRM" />
            <el-option label="独立律师" value="SOLO" />
            <el-option label="律师团队" value="TEAM" />
            <el-option label="支持企业" value="SUPPORT_ORG" />
          </el-select>
        </el-form-item>
        <el-form-item label="部署模式" required>
          <el-select v-model="newTenant.deploymentMode" style="width: 100%">
            <el-option label="SaaS 多租户" value="SAAS" />
            <el-option label="私有化部署" value="PRIVATE" />
            <el-option label="个人工作台" value="PERSONAL" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">首个管理员</el-divider>
        <el-form-item label="用户名" required>
          <el-input v-model="newTenant.adminUsername" placeholder="如 admin" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input v-model="newTenant.adminPassword" type="password" show-password placeholder="≥ 8 字符" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="newTenant.adminRealName" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="newTenant.adminMobile" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="newTenant.adminEmail" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="onCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>
