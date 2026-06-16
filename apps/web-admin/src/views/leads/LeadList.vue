<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import type { Lead } from '@lm-unity/shared';

const items = ref<Lead[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);

async function load() {
  loading.value = true;
  try {
    const res: any = await http.get(`/leads?page=${page.value}&pageSize=${pageSize.value}`);
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2>线索看板</h2>
    <p style="color: #888">任务书 6.2 / 7.2 · 线索全生命周期</p>
    <el-table v-loading="loading" :data="items" stripe style="margin-top: 16px">
      <el-table-column prop="clientName" label="客户名称" />
      <el-table-column prop="sourceChannel" label="来源" width="120" />
      <el-table-column prop="legalIssueType" label="问题类型" width="160" />
      <el-table-column prop="urgencyLevel" label="紧急程度" width="120" />
      <el-table-column prop="intakeStatus" label="状态" width="200" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="load"
    />
  </div>
</template>
