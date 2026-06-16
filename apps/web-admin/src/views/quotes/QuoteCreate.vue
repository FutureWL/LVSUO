<script setup lang="ts">
import http from '@/api/http';
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import type { ServiceProduct } from '@lm-unity/shared';

const route = useRoute();
const router = useRouter();
const leadId = ref((route.query.leadId as string) || '');
const clientId = ref((route.query.clientId as string) || '');
const products = ref<ServiceProduct[]>([]);

const form = ref({
  leadId: leadId.value,
  clientId: clientId.value,
  productId: '',
  serviceScope: '',
  excludedScope: '',
  lawyerFee: undefined as number | undefined,
  thirdPartyCosts: [{ category: '法院费用', amount: 0, description: '' }],
  paymentSchedule: '',
  additionalFeeConditions: '',
  riskDisclosureConfirmed: false,
  containsSuccessPromise: false,
});
const saving = ref(false);

async function load() {
  products.value = await http.get<ServiceProduct[]>('/service-products');
}

function addCost() {
  form.value.thirdPartyCosts.push({ category: '', amount: 0, description: '' });
}

function removeCost(idx: number) {
  form.value.thirdPartyCosts.splice(idx, 1);
}

async function submit() {
  saving.value = true;
  try {
    await http.post('/quotes', form.value);
    ElMessage.success('报价创建成功');
    router.push('/quotes');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h2>新建报价卡</h2>
    <p style="color: #888">任务书 10.4 · 报价阻断规则校验</p>

    <el-card style="margin-top: 16px; max-width: 800px">
      <el-form :model="form" label-position="top">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="线索 ID">
              <el-input v-model="form.leadId" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户 ID">
              <el-input v-model="form.clientId" disabled />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="服务产品">
          <el-select v-model="form.productId" clearable style="width: 100%">
            <el-option
              v-for="p in products"
              :key="p.id"
              :label="p.productName"
              :value="p.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="服务范围">
          <el-input v-model="form.serviceScope" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="不包含事项">
          <el-input v-model="form.excludedScope" type="textarea" :rows="3" />
        </el-form-item>

        <el-form-item label="律师费">
          <el-input-number v-model="form.lawyerFee" :min="0" style="width: 100%" />
        </el-form-item>

        <el-form-item label="第三方费用">
          <div v-for="(cost, idx) in form.thirdPartyCosts" :key="idx" style="display: flex; gap: 8px; margin-bottom: 8px">
            <el-input v-model="cost.category" placeholder="类别" style="width: 120px" />
            <el-input-number v-model="cost.amount" :min="0" placeholder="金额" />
            <el-input v-model="cost.description" placeholder="说明" style="flex: 1" />
            <el-button type="danger" size="small" @click="removeCost(idx)">删除</el-button>
          </div>
          <el-button link @click="addCost">+ 添加费用</el-button>
        </el-form-item>

        <el-form-item label="付款节点">
          <el-input v-model="form.paymentSchedule" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item label="追加费用条件">
          <el-input v-model="form.additionalFeeConditions" type="textarea" :rows="2" />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.riskDisclosureConfirmed">客户已确认风险揭示</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="form.containsSuccessPromise">包含承诺结果表述</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button @click="router.back()">取消</el-button>
          <el-button type="primary" :loading="saving" @click="submit">保存报价</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
