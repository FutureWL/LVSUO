<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/api/http';

const items = ref<any[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    // 简化:直接读取(实际应有专门 API)
    items.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2>内容合规审查</h2>
    <p style="color: #888">任务书 7.x · 推广内容三审(运营自检 / 律师审查 / 风控审查)</p>
    <el-alert type="warning" :closable="false" style="margin: 16px 0">
      内容审查 endpoint 待第 7 章模块一开发时接入
    </el-alert>
    <el-table v-loading="loading" :data="items" stripe>
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="reviewStatus" label="审查状态" width="160" />
      <el-table-column prop="riskLevel" label="风险等级" width="120" />
    </el-table>
  </div>
</template>
