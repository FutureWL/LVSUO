<script setup lang="ts">
import http from '@/api/http';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { type FeeQuote } from '@lm-unity/shared';
import { useTable } from '@/composables/useTable';
import TableEmpty from '@/components/TableEmpty.vue';

const router = useRouter();
const { items, total, page, pageSize, loading, empty, reload, resetAndLoad } = useTable<FeeQuote>({ url: '/quotes' });

const STATUS_NAME: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_APPROVAL: '待审批',
  APPROVED: '已审批',
  SENT: '已发送',
  CLIENT_CONFIRMED: '客户已确认',
  REJECTED: '已拒绝',
};
function statusName(s: string) {
  return STATUS_NAME[s] || s;
}

async function approve(row: FeeQuote) {
  await http.post(`/quotes/${row.id}/approve`);
  reload();
}

async function send(row: FeeQuote) {
  await http.post(`/quotes/${row.id}/send-to-client`);
  reload();
}

async function confirm(row: FeeQuote) {
  await http.post(`/quotes/${row.id}/client-confirm`);
  reload();
}

onMounted(() => resetAndLoad());
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>报价卡</h2>
        <p style="color: #888">任务书 10.x · 透明报价与服务边界</p>
      </div>
      <el-button type="primary" @click="router.push('/quotes/create')">+ 新建报价</el-button>
    </div>

    <el-table v-loading="loading" :data="items" stripe style="margin-top: 16px">
      <el-table-column prop="id" label="报价编号" width="180" />
      <el-table-column label="关联客户" width="160">
        <template #default="{ row }">
          {{ row.clientId || row.leadId || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="lawyerFee" label="律师费" width="120" />
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag>{{ statusName(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="客户确认" width="100">
        <template #default="{ row }">
          {{ row.clientConfirmed ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button link size="small" @click="approve(row as FeeQuote)">审批</el-button>
          <el-button link size="small" @click="send(row as FeeQuote)">发送</el-button>
          <el-button link size="small" @click="confirm(row as FeeQuote)">客户确认</el-button>
        </template>
      </el-table-column>
    </el-table>

    <TableEmpty v-if="empty" description="暂无报价" />

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
