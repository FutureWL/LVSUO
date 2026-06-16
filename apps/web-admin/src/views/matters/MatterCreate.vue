<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { User, Client } from '@lm-unity/shared';

const route = useRoute();
const router = useRouter();
const clientId = ref((route.query.clientId as string) || '');
const quoteId = ref((route.query.quoteId as string) || '');

const clients = ref<Client[]>([]);
const users = ref<User[]>([]);
const quotes = ref<any[]>([]);

const form = ref({
  clientId: clientId.value,
  quoteId: quoteId.value,
  matterTitle: '',
  matterType: '',
  disputeAmount: undefined as number | undefined,
  confidentialityLevel: 'L3_MATTER_TEAM' as any,
  responsiblePartnerId: '',
  leadLawyerId: '',
  billingType: 'HOURLY' as any,
  budgetAmount: undefined as number | undefined,
});
const saving = ref(false);

async function load() {
  const [clientsRes, usersRes, quotesRes] = await Promise.all([
    http.get<any>('/clients'),
    http.get<User[]>('/users'),
    http.get<any>('/quotes'),
  ]);
  clients.value = clientsRes.items || [];
  users.value = usersRes;
  quotes.value = (quotesRes.items || []).filter((q: any) => q.status === 'CLIENT_CONFIRMED' && !q.matterId);
}

async function submit() {
  saving.value = true;
  try {
    if (form.value.quoteId) {
      await http.post('/matters/from-quote', {
        quoteId: form.value.quoteId,
        matterTitle: form.value.matterTitle,
        matterType: form.value.matterType,
        disputeAmount: form.value.disputeAmount,
        confidentialityLevel: form.value.confidentialityLevel,
        responsiblePartnerId: form.value.responsiblePartnerId || undefined,
        leadLawyerId: form.value.leadLawyerId || undefined,
        billingType: form.value.billingType,
        budgetAmount: form.value.budgetAmount,
      });
    } else {
      await http.post('/matters', form.value);
    }
    ElMessage.success('案件创建成功');
    router.push('/matters');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2>新建案件</h2>
    <p style="color: #888">任务书 8.10 / 14.x · 案件作战室入口</p>

    <el-card style="margin-top: 16px; max-width: 800px">
      <el-form :model="form" label-position="top">
        <el-form-item label="从报价创建">
          <el-select v-model="form.quoteId" clearable style="width: 100%" placeholder="选择已确认报价(可选)">
            <el-option
              v-for="q in quotes"
              :key="q.id"
              :label="`${q.id} - ${q.lawyerFee}元`"
              :value="q.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="客户">
          <el-select v-model="form.clientId" style="width: 100%" :disabled="!!clientId">
            <el-option
              v-for="c in clients"
              :key="c.id"
              :label="c.clientName"
              :value="c.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="案件标题">
          <el-input v-model="form.matterTitle" />
        </el-form-item>

        <el-form-item label="案由">
          <el-input v-model="form.matterType" />
        </el-form-item>

        <el-form-item label="争议金额">
          <el-input-number v-model="form.disputeAmount" :min="0" style="width: 100%" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="负责合伙人">
              <el-select v-model="form.responsiblePartnerId" clearable style="width: 100%">
                <el-option
                  v-for="u in users.filter((x) => x.roleType?.includes('PARTNER'))"
                  :key="u.id"
                  :label="u.realName"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="主办律师">
              <el-select v-model="form.leadLawyerId" clearable style="width: 100%">
                <el-option
                  v-for="u in users.filter((x) => x.roleType?.includes('LAWYER'))"
                  :key="u.id"
                  :label="u.realName"
                  :value="u.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="计费方式">
              <el-select v-model="form.billingType" style="width: 100%">
                <el-option label="计时" value="HOURLY" />
                <el-option label="固定" value="FIXED" />
                <el-option label="风险" value="CONTINGENT" />
                <el-option label="常年" value="RETAINER" />
                <el-option label="混合" value="HYBRID" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="预算金额">
              <el-input-number v-model="form.budgetAmount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button @click="router.back()">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">创建案件</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
