<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';

const stats = ref({ leads: 0, matters: 0, products: 0, cards: 0 });

onMounted(async () => {
  try {
    const [leads, matters, products, cards] = await Promise.all([
      http.get('/leads?page=1&pageSize=1'),
      http.get('/matters?page=1&pageSize=1'),
      http.get('/service-products'),
      http.get('/knowledge-cards'),
    ]);
    stats.value = {
      leads: leads.total ?? 0,
      matters: matters.total ?? 0,
      products: products.length ?? 0,
      cards: cards.length ?? 0,
    };
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
          <h3>知识卡</h3>
          <p style="font-size: 32px; color: #fa8c16">{{ stats.cards }}</p>
        </el-card>
      </el-col>
    </el-row>

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
