<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { LEAD_STATUS_NAME, LeadStatus, type Lead, type UrgencyLevel } from '@lm-unity/shared';
import { useTable } from '@/composables/useTable';
import TableEmpty from '@/components/TableEmpty.vue';

const router = useRouter();

// 列表状态(分页/loading/empty 全在 composable 里)
const { items, total, page, pageSize, loading, empty, reload, resetAndLoad } = useTable<Lead>({ url: '/leads' });

// 搜索 + 筛选(由视图管理,load 时 merge 进 query)
const keyword = ref('');
const filterStatus = ref<LeadStatus | ''>('');
const filterUrgency = ref<UrgencyLevel | ''>('');
const filterDateRange = ref<[string, string] | null>(null);

const URGENCY_OPTIONS: { label: string; value: UrgencyLevel }[] = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' },
  { label: '紧急', value: 'URGENT' },
];

const STATUS_OPTIONS = (Object.keys(LEAD_STATUS_NAME) as LeadStatus[]).map((s) => ({
  label: LEAD_STATUS_NAME[s],
  value: s,
}));

function buildParams() {
  return {
    keyword: keyword.value.trim() || undefined,
    status: filterStatus.value || undefined,
    urgency: filterUrgency.value || undefined,
    from: filterDateRange.value?.[0],
    to: filterDateRange.value?.[1],
  };
}

function onSearch() {
  resetAndLoad(buildParams());
}

function onReset() {
  keyword.value = '';
  filterStatus.value = '';
  filterUrgency.value = '';
  filterDateRange.value = null;
  resetAndLoad(buildParams());
}

const hasFilter = () =>
  !!keyword.value || !!filterStatus.value || !!filterUrgency.value || !!filterDateRange.value;

function goDetail(row: Lead) {
  router.push(`/leads/${row.id}`);
}

// 新建线索
const dialogVisible = ref(false);
const form = ref({
  sourceChannel: '',
  clientName: '',
  contactMobile: '',
  contactEmail: '',
  legalIssueType: '',
  urgencyLevel: 'MEDIUM' as any,
});
const saving = ref(false);

async function create() {
  saving.value = true;
  try {
    await http.post('/leads', form.value);
    dialogVisible.value = false;
    form.value = { sourceChannel: '', clientName: '', contactMobile: '', contactEmail: '', legalIssueType: '', urgencyLevel: 'MEDIUM' };
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
        <h2>线索看板</h2>
        <p style="color: #888">任务书 6.2 / 7.2 · 线索全生命周期</p>
      </div>
      <el-button type="primary" @click="dialogVisible = true">+ 新建线索</el-button>
    </div>
    <div style="margin-top: 16px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
      <el-input
        v-model="keyword"
        placeholder="按客户名 / 手机号搜索"
        clearable
        style="width: 240px"
        @keyup.enter="onSearch"
        @clear="onReset"
      />
      <el-select
        v-model="filterStatus"
        placeholder="状态"
        clearable
        style="width: 160px"
        @change="onSearch"
        @clear="onSearch"
      >
        <el-option v-for="o in STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
      <el-select
        v-model="filterUrgency"
        placeholder="紧急程度"
        clearable
        style="width: 120px"
        @change="onSearch"
        @clear="onSearch"
      >
        <el-option v-for="o in URGENCY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
      </el-select>
      <el-date-picker
        v-model="filterDateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        unlink-panels
        style="width: 260px"
        @change="onSearch"
      />
      <el-button type="primary" @click="onSearch">搜索</el-button>
      <el-button v-if="hasFilter()" @click="onReset">重置</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="items"
      stripe
      style="margin-top: 16px"
      @row-click="goDetail"
    >
      <el-table-column prop="clientName" label="客户名称" />
      <el-table-column prop="sourceChannel" label="来源" width="120" />
      <el-table-column prop="legalIssueType" label="问题类型" width="160" />
      <el-table-column prop="urgencyLevel" label="紧急程度" width="120" />
      <el-table-column label="状态" width="160">
        <template #default="{ row }">
          {{ LEAD_STATUS_NAME[row.intakeStatus as keyof typeof LEAD_STATUS_NAME] }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180" />
    </el-table>

    <TableEmpty v-if="empty" description="暂无匹配的线索" />

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      style="margin-top: 16px; justify-content: flex-end"
      @current-change="reload"
    />

    <el-dialog v-model="dialogVisible" title="新建线索" width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="客户名称">
          <el-input v-model="form.clientName" />
        </el-form-item>
        <el-form-item label="来源渠道">
          <el-input v-model="form.sourceChannel" placeholder="如抖音/官网/转介绍" />
        </el-form-item>
        <el-form-item label="问题类型">
          <el-input v-model="form.legalIssueType" placeholder="案由" />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="form.urgencyLevel" style="width: 100%">
            <el-option label="低" value="LOW" />
            <el-option label="中" value="MEDIUM" />
            <el-option label="高" value="HIGH" />
            <el-option label="紧急" value="URGENT" />
          </el-select>
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
