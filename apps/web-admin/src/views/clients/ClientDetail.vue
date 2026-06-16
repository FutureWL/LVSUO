<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Client } from '@lm-unity/shared';

const route = useRoute();
const router = useRouter();
const client = ref<Client | null>(null);
const loading = ref(false);
const matters = ref<any[]>([]);

async function load() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    client.value = await http.get<Client>(`/clients/${id}`);
    const res: any = await http.get(`/matters?page=1&pageSize=100`);
    matters.value = res.items.filter((m: any) => m.clientId === id);
  } finally {
    loading.value = false;
  }
}

function createMatter() {
  router.push(`/matters/create?clientId=${client.value?.id}`);
}

onMounted(load);
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>{{ client?.clientName || '客户详情' }}</h2>
        <p style="color: #888">客户生命周期与关联案件</p>
      </div>
      <el-button type="primary" @click="createMatter">+ 新建案件</el-button>
    </div>

    <el-card style="margin-top: 16px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="客户名称">{{ client?.clientName }}</el-descriptions-item>
        <el-descriptions-item label="客户类型">
          {{ client?.clientType === 'ENTERPRISE' ? '企业' : '个人' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ client?.contactName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ client?.contactMobile || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系邮箱">{{ client?.contactEmail || '-' }}</el-descriptions-item>
        <el-descriptions-item label="风险等级">{{ client?.riskLevel }}</el-descriptions-item>
        <el-descriptions-item label="健康分">{{ client?.healthScore }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ client?.status }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card style="margin-top: 16px">
      <template #header>
        <span>关联案件</span>
      </template>
      <el-table :data="matters" stripe>
        <el-table-column prop="matterNo" label="案件编号" width="140" />
        <el-table-column prop="matterTitle" label="案件标题" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180" />
      </el-table>
      <el-empty v-if="matters.length === 0" description="暂无关联案件" />
    </el-card>
  </div>
</template>
