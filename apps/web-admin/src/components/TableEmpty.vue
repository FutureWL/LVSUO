<template>
  <div class="table-empty">
    <el-empty :description="description" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ description?: string }>(), {
  description: '暂无数据',
});
</script>

<style scoped>
.table-empty {
  padding: 32px 0;
}
</style>
