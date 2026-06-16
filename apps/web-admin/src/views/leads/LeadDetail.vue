<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { LEAD_STATUS_NAME, TRIAGE_RESULT_NAME, type Lead, type TriageResult, type User } from '@lm-unity/shared';

const route = useRoute();
const router = useRouter();
const lead = ref<Lead | any>(null);
const loading = ref(false);
const users = ref<User[]>([]);

const assignDialog = ref(false);
const selectedLawyer = ref('');

const triageDialog = ref(false);
const triageForm = ref({
  factsSummary: '',
  evidenceSummary: '',
  urgencyReason: '',
  triageResult: 'STRUCTURED_DIAGNOSIS' as TriageResult,
  recommendedProductId: '',
  shouldTransferToLawyer: false,
});
const products = ref<any[]>([]);

const convertDialog = ref(false);
const convertForm = ref({
  clientName: '',
  clientType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'ENTERPRISE',
  contactName: '',
  contactMobile: '',
  contactEmail: '',
});

async function load() {
  loading.value = true;
  try {
    const id = route.params.id as string;
    lead.value = await http.get(`/leads/${id}`);
    const [usersRes, productsRes] = await Promise.all([
      http.get<User[]>('/users'),
      http.get<any[]>('/service-products'),
    ]);
    users.value = usersRes;
    products.value = productsRes;
  } finally {
    loading.value = false;
  }
}

async function assignLawyer() {
  if (!selectedLawyer.value) return;
  await http.post(`/leads/${lead.value.id}/assign-lawyer`, { lawyerId: selectedLawyer.value });
  assignDialog.value = false;
  ElMessage.success('已分配律师');
  await load();
}

async function submitTriage() {
  await http.post(`/leads/${lead.value.id}/triage`, {
    ...triageForm.value,
    confirmedBy: selectedLawyer.value || undefined,
  });
  triageDialog.value = false;
  ElMessage.success('分诊已保存');
  await load();
}

async function convertToClient() {
  await http.post('/clients/convert-from-lead', {
    leadId: lead.value.id,
    ...convertForm.value,
  });
  convertDialog.value = false;
  ElMessage.success('已转为客户');
  await load();
}

function quoteForLead() {
  router.push(`/quotes/create?leadId=${lead.value.id}`);
}

onMounted(load);
</script>

<template>
  <div v-loading="loading">
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>线索详情</h2>
        <p style="color: #888">任务书 6.2 / 8.3 · 线索分诊与转化</p>
      </div>
      <div style="display: flex; gap: 8px">
        <el-button @click="assignDialog = true">分配律师</el-button>
        <el-button @click="triageDialog = true">结构化分诊</el-button>
        <el-button type="primary" @click="quoteForLead">创建报价</el-button>
        <el-button type="success" @click="convertDialog = true">转为客户</el-button>
      </div>
    </div>

    <el-card style="margin-top: 16px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="客户名称">{{ lead?.clientName }}</el-descriptions-item>
        <el-descriptions-item label="来源渠道">{{ lead?.sourceChannel }}</el-descriptions-item>
        <el-descriptions-item label="问题类型">{{ lead?.legalIssueType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="紧急程度">{{ lead?.urgencyLevel }}</el-descriptions-item>
        <el-descriptions-item label="情绪状态">{{ lead?.emotionalState }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">{{ LEAD_STATUS_NAME[lead?.intakeStatus as keyof typeof LEAD_STATUS_NAME] }}</el-descriptions-item>
        <el-descriptions-item label="分配律师">
          {{ lead?.assignedLawyer?.realName || '未分配' }}
        </el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ lead?.contactMobile || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-if="lead?.triages?.length" style="margin-top: 16px">
      <template #header><span>最新分诊</span></template>
      <p><strong>分诊结果:</strong> {{ TRIAGE_RESULT_NAME[lead.triages[0].triageResult as TriageResult] }}</p>
      <p><strong>事实摘要:</strong> {{ lead.triages[0].factsSummary || '-' }}</p>
      <p><strong>证据摘要:</strong> {{ lead.triages[0].evidenceSummary || '-' }}</p>
    </el-card>

    <!-- 分配律师 -->
    <el-dialog v-model="assignDialog" title="分配律师" width="400px">
      <el-select v-model="selectedLawyer" placeholder="选择律师" style="width: 100%">
        <el-option
          v-for="u in users.filter((x) => x.roleType?.includes('LAWYER') || x.roleType?.includes('PARTNER'))"
          :key="u.id"
          :label="u.realName"
          :value="u.id"
        />
      </el-select>
      <template #footer>
        <el-button @click="assignDialog = false">取消</el-button>
        <el-button type="primary" @click="assignLawyer">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分诊 -->
    <el-dialog v-model="triageDialog" title="结构化分诊" width="600px">
      <el-form :model="triageForm" label-position="top">
        <el-form-item label="事实摘要">
          <el-input v-model="triageForm.factsSummary" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="证据摘要">
          <el-input v-model="triageForm.evidenceSummary" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="紧急原因">
          <el-input v-model="triageForm.urgencyReason" />
        </el-form-item>
        <el-form-item label="分诊结果">
          <el-select v-model="triageForm.triageResult" style="width: 100%">
            <el-option
              v-for="(label, key) in TRIAGE_RESULT_NAME"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="推荐产品">
          <el-select v-model="triageForm.recommendedProductId" clearable style="width: 100%">
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="p.productName"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="triageForm.shouldTransferToLawyer">需要转交律师</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="triageDialog = false">取消</el-button>
        <el-button type="primary" @click="submitTriage">保存分诊</el-button>
      </template>
    </el-dialog>

    <!-- 转客户 -->
    <el-dialog v-model="convertDialog" title="转为客户" width="500px">
      <el-form :model="convertForm" label-position="top">
        <el-form-item label="客户名称">
          <el-input v-model="convertForm.clientName" :placeholder="lead?.clientName" />
        </el-form-item>
        <el-form-item label="客户类型">
          <el-radio-group v-model="convertForm.clientType">
            <el-radio label="INDIVIDUAL">个人</el-radio>
            <el-radio label="ENTERPRISE">企业</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="convertForm.contactName" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="convertForm.contactMobile" :placeholder="lead?.contactMobile" />
        </el-form-item>
        <el-form-item label="联系邮箱">
          <el-input v-model="convertForm.contactEmail" :placeholder="lead?.contactEmail" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="convertDialog = false">取消</el-button>
        <el-button type="primary" @click="convertToClient">确认转化</el-button>
      </template>
    </el-dialog>
  </div>
</template>
