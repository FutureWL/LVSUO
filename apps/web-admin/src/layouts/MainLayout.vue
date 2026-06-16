<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const menuItems = [
  { path: '/dashboard', title: '总览驾驶舱', icon: 'DataAnalysis' },
  { path: '/leads', title: '线索看板', icon: 'User' },
  { path: '/marketing', title: '内容合规审查', icon: 'Document' },
  { path: '/products', title: '服务产品库', icon: 'Goods' },
  { path: '/matters', title: '案件看板', icon: 'Folder' },
];

const onLogout = () => {
  auth.clear();
  router.push({ name: 'login' });
};
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" style="background: #001529; color: #fff">
      <div style="padding: 20px; font-size: 18px; font-weight: bold; text-align: center">
        智法云枢
      </div>
      <el-menu
        :default-active="$route.path"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#1890ff"
        router
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <span>{{ item.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header
        style="background: #fff; border-bottom: 1px solid #e8e8e8; display: flex; align-items: center; justify-content: space-between"
      >
        <div style="font-size: 16px">{{ $route.meta.title || '智法云枢' }}</div>
        <div>
          <el-dropdown @command="onLogout">
            <span style="cursor: pointer">
              {{ auth.user?.realName || '未登录' }}
              <el-icon style="margin-left: 4px"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>
