<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { buildDashboardStats, type DashboardResponses } from '@/utils/dashboard';

const router = useRouter();
const stats = ref<ReturnType<typeof buildDashboardStats>>(
  buildDashboardStats({
    leads: {},
    matters: {},
    products: [],
    cards: [],
    clients: {},
    quotes: {},
  }),
);

onMounted(async () => {
  try {
    const [leads, matters, products, cards, clients, quotes] = await Promise.all([
      http.get<{ total: number }>('/leads?page=1&pageSize=1'),
      http.get<{ total: number }>('/matters?page=1&pageSize=1'),
      http.get<unknown[]>('/service-products'),
      http.get<unknown[]>('/knowledge-cards'),
      http.get<{ total: number }>('/clients?page=1&pageSize=1'),
      http.get<{ total: number }>('/quotes?page=1&pageSize=1'),
    ]);
    const r: DashboardResponses = { leads, matters, products, cards, clients, quotes };
    stats.value = buildDashboardStats(r);
  } catch {
    // ignore
  }
});
</script>

<template>
  <div>
    <h2>总览驾驶舱</h2>
    <p style="color: #888">任务书 11.1 / 12.x · 律所核心指标可视化</p>
    <el-row :gutter="20" style="margin-top: 24px">
      <el-col :span="6">
        <el-card>
          <h3>线索总数</h3>
          <p style="font-size: 32px; color: #1890ff">{{ stats.leads }}</p>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <h3>案件总数</h3>
          <p style="font-size: 32px; color: #52c41a">{{ stats.matters }}</p>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <h3>服务产品</h3>
          <p style="font-size: 32px; color: #722ed1">{{ stats.products }}</p>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <h3>客户</h3>
          <p style="font-size: 32px; color: #fa8c16">{{ stats.clients }}</p>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card>
          <h3>报价卡</h3>
          <p style="font-size: 32px; color: #eb2f96">{{ stats.quotes }}</p>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 24px">
      <template #header>
        <span>快捷操作</span>
      </template>
      <el-space>
        <el-button type="primary" @click="router.push('/leads')">线索看板</el-button>
        <el-button @click="router.push('/clients')">客户中心</el-button>
        <el-button @click="router.push('/quotes/create')">新建报价</el-button>
        <el-button @click="router.push('/matters/create')">新建案件</el-button>
      </el-space>
    </el-card>

    <el-card style="margin-top: 24px">
      <template #header>
        <span>核心指标(任务书 12.1 / 12.4)</span>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="合规线索率">%</el-descriptions-item>
        <el-descriptions-item label="报价转化率">%</el-descriptions-item>
        <el-descriptions-item label="风险揭示确认率">%</el-descriptions-item>
        <el-descriptions-item label="违规内容拦截率">%</el-descriptions-item>
        <el-descriptions-item label="客户健康分均值">—</el-descriptions-item>
        <el-descriptions-item label="知识卡入库率">%</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>
