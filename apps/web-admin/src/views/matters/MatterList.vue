<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { MatterStatus, MATTER_STATUS_NAME, type Matter } from '@lm-unity/shared';
import { useTable } from '@/composables/useTable';
import TableEmpty from '@/components/TableEmpty.vue';

const router = useRouter();
const { items, total, page, pageSize, loading, empty, reload, resetAndLoad } = useTable<Matter>({ url: '/matters' });

function statusName(s: string) {
  return MATTER_STATUS_NAME[s as MatterStatus] || s;
}

onMounted(() => resetAndLoad());
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>案件看板</h2>
        <p style="color: #888">任务书 6.4 · 案件办理 24 状态机</p>
      </div>
      <el-button type="primary" @click="router.push('/matters/create')">+ 新建案件</el-button>
    </div>
    <el-table v-loading="loading" :data="items" stripe style="margin-top: 16px">
      <el-table-column prop="matterNo" label="案件编号" width="140" />
      <el-table-column prop="matterTitle" label="案件标题" />
      <el-table-column label="客户" width="160">
        <template #default="{ row }">
          {{ row.client?.clientName || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="200">
        <template #default="{ row }">
          <el-tag>{{ statusName(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="disputeAmount" label="争议金额" width="120" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>

    <TableEmpty v-if="empty" description="暂无案件" />

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="reload"
    />
  </div>
</template>
