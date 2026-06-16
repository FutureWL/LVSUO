<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import type { Client, ClientType } from '@lm-unity/shared';
import { useTable } from '@/composables/useTable';
import TableEmpty from '@/components/TableEmpty.vue';

const router = useRouter();
const { items, total, page, pageSize, loading, empty, reload, resetAndLoad } = useTable<Client>({ url: '/clients' });

const dialogVisible = ref(false);
const form = ref({
  clientName: '',
  clientType: 'INDIVIDUAL' as ClientType,
  contactName: '',
  contactMobile: '',
  contactEmail: '',
});
const saving = ref(false);

function goDetail(row: Client) {
  router.push(`/clients/${row.id}`);
}

async function create() {
  saving.value = true;
  try {
    await http.post('/clients', form.value);
    dialogVisible.value = false;
    form.value = { clientName: '', clientType: 'INDIVIDUAL', contactName: '', contactMobile: '', contactEmail: '' };
    reload();
  } finally {
    saving.value = false;
  }
}

onMounted(() => resetAndLoad());
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>客户中心</h2>
        <p style="color: #888">任务书 8.9 / 13.x · 客户全生命周期管理</p>
      </div>
      <el-button type="primary" @click="dialogVisible = true">+ 新建客户</el-button>
    </div>

    <el-table v-loading="loading" :data="items" stripe style="margin-top: 16px" @row-click="goDetail">
      <el-table-column prop="clientName" label="客户名称" />
      <el-table-column prop="clientType" label="类型" width="120">
        <template #default="{ row }">
          <el-tag>{{ row.clientType === 'ENTERPRISE' ? '企业' : '个人' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="contactName" label="联系人" width="120" />
      <el-table-column prop="contactMobile" label="联系电话" width="140" />
      <el-table-column prop="riskLevel" label="风险等级" width="100" />
      <el-table-column prop="healthScore" label="健康分" width="100" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>

    <TableEmpty v-if="empty" description="暂无客户" />

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="reload"
    />

    <el-dialog v-model="dialogVisible" title="新建客户" width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="客户名称">
          <el-input v-model="form.clientName" />
        </el-form-item>
        <el-form-item label="客户类型">
          <el-radio-group v-model="form.clientType">
            <el-radio label="INDIVIDUAL">个人</el-radio>
            <el-radio label="ENTERPRISE">企业</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.contactName" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contactMobile" />
        </el-form-item>
        <el-form-item label="联系邮箱">
          <el-input v-model="form.contactEmail" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="create">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
