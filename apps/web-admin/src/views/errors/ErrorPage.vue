<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();
const route = useRoute();

const status = computed(() => {
  const s = Number(route.query.status);
  return Number.isFinite(s) ? s : 500;
});

const title = computed(() => {
  switch (status.value) {
    case 403:
      return '无权访问';
    case 404:
      return '资源不存在';
    default:
      return '服务异常';
  }
});

const description = computed(() => {
  const d = route.query.message as string | undefined;
  return d || '抱歉,发生了一些意外。请稍后重试或联系管理员。';
});

function goHome() {
  router.push('/dashboard');
}
</script>

<template>
  <div class="error-page">
    <div class="card">
      <div class="code">{{ status }}</div>
      <h2>{{ title }}</h2>
      <p class="desc">{{ description }}</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}
.card {
  background: #fff;
  padding: 48px 64px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
  max-width: 480px;
}
.code {
  font-size: 96px;
  font-weight: 700;
  color: #dcdfe6;
  line-height: 1;
  margin-bottom: 16px;
}
.desc {
  color: #909399;
  margin: 16px 0 32px;
  word-break: break-word;
}
</style>
