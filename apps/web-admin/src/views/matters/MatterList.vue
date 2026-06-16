<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/api/http';
import { MatterStatus, MATTER_STATUS_NAME } from '@lm-unity/shared';

const items = ref<any[]>([]);
const total = ref(0);
const loading = ref(false);
const page = ref(1);

async function load() {
  loading.value = true;
  try {
    const res: any = await http.get(`/matters?page=${page.value}&pageSize=20`);
    items.value = res.items;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function statusName(s: string) {
  return MATTER_STATUS_NAME[s as MatterStatus] || s;
}

onMounted(load);
</script>

<template>
  <div>
    <h2>案件看板</h2>
    <p style="color: #888">任务书 6.4 · 案件办理 24 状态机</p>
    <el-table v-loading="loading" :data="items" stripe>
      <el-table-column prop="matterNo" label="案件编号" width="140" />
      <el-table-column prop="matterTitle" label="案件标题" />
      <el-table-column label="状态" width="200">
        <template #default="{ row }">
          <el-tag>{{ statusName(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="disputeAmount" label="争议金额" width="120" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>
  </div>
</template>
