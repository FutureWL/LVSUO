<script setup lang="ts">
import { ref, onMounted } from 'vue';
import http from '@/api/http';
import type { ServiceProduct } from '@lm-unity/shared';

const items = ref<ServiceProduct[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const saving = ref(false);
const form = ref({
  productName: '',
  productType: 'P1' as any,
  serviceScope: '',
  excludedScope: '',
  basePrice: undefined as number | undefined,
  deliveryDays: undefined as number | undefined,
});

async function load() {
  loading.value = true;
  try {
    items.value = await http.get('/service-products');
  } finally {
    loading.value = false;
  }
}

async function create() {
  saving.value = true;
  try {
    await http.post('/service-products', form.value);
    dialogVisible.value = false;
    form.value = { productName: '', productType: 'P1', serviceScope: '', excludedScope: '', basePrice: undefined, deliveryDays: undefined };
    await load();
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center">
      <div>
        <h2>服务产品库</h2>
        <p style="color: #888">任务书 9.x · P0-P7 八层产品</p>
      </div>
      <el-button type="primary" @click="dialogVisible = true">+ 新建产品</el-button>
    </div>
    <el-table v-loading="loading" :data="items" stripe style="margin-top: 16px">
      <el-table-column prop="productName" label="产品名称" />
      <el-table-column prop="productType" label="类型" width="100" />
      <el-table-column prop="basePrice" label="基础价格" width="120" />
      <el-table-column prop="deliveryDays" label="交付天数" width="100" />
      <el-table-column prop="status" label="状态" width="100" />
    </el-table>

    <el-dialog v-model="dialogVisible" title="新建服务产品" width="500px">
      <el-form :model="form" label-position="top">
        <el-form-item label="产品名称">
          <el-input v-model="form.productName" />
        </el-form-item>
        <el-form-item label="产品类型">
          <el-select v-model="form.productType" style="width: 100%">
            <el-option label="P0 免费法律信息" value="P0" />
            <el-option label="P1 低价结构化诊断" value="P1" />
            <el-option label="P2 标准文书产品" value="P2" />
            <el-option label="P3 流程辅导产品" value="P3" />
            <el-option label="P4 单节点代理产品" value="P4" />
            <el-option label="P5 完整代理产品" value="P5" />
            <el-option label="P6 企业订阅/常年顾问" value="P6" />
            <el-option label="P7 专项法律项目" value="P7" />
          </el-select>
        </el-form-item>
        <el-form-item label="服务范围">
          <el-input v-model="form.serviceScope" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="不包含事项">
          <el-input v-model="form.excludedScope" type="textarea" :rows="2" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="基础价格">
              <el-input-number v-model="form.basePrice" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="交付天数">
              <el-input-number v-model="form.deliveryDays" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="create">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
