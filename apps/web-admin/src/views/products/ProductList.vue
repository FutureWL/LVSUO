<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/api/http';
import type { ServiceProduct } from '@lm-unity/shared';

const items = ref<ServiceProduct[]>([]);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    items.value = await http.get('/service-products');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2>服务产品库</h2>
    <p style="color: #888">任务书 9.x · P0-P7 八层产品(P0 免费 / P1 诊断 / P2 文书 / P3 辅导 / P4 单节点 / P5 完整 / P6 订阅 / P7 专项)</p>
    <el-table v-loading="loading" :data="items" stripe>
      <el-table-column prop="productName" label="产品名称" />
      <el-table-column prop="productType" label="类型" width="100" />
      <el-table-column prop="basePrice" label="基础价格" width="120" />
      <el-table-column prop="deliveryDays" label="交付天数" width="100" />
      <el-table-column prop="status" label="状态" width="100" />
    </el-table>
  </div>
</template>
