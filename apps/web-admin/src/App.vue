<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <el-config-provider>
    <RouterView />
  </el-config-provider>
</template>

<style>
#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  height: 100vh;
}
</style>
