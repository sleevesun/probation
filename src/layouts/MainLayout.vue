<template>
  <a-layout class="main-layout">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <h2 v-if="!collapsed" class="logo-title">试用期转正系统</h2>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="light"
        mode="inline"
        @click="handleMenuClick"
      >
        <a-sub-menu key="sub1" v-if="role === 'Employee'">
          <template #title>
            <span>
              <user-outlined />
              <span>员工端门户</span>
            </span>
          </template>
          <a-menu-item key="/employee/dashboard">我的试用期</a-menu-item>
          <a-menu-item key="/employee/goals">目标设定</a-menu-item>
          <a-menu-item key="/employee/self-eval">试用期自评</a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="sub2" v-if="role === 'Manager'">
          <template #title>
            <span>
              <team-outlined />
              <span>主管端门户</span>
            </span>
          </template>
          <a-menu-item key="/manager/team">团队管理看板</a-menu-item>
        </a-sub-menu>
        
        <a-sub-menu key="sub3" v-if="role === 'HRBP'">
          <template #title>
            <span>
              <safety-certificate-outlined />
              <span>HRBP 门户</span>
            </span>
          </template>
          <a-menu-item key="/hrbp/panorama">试用期全景看板</a-menu-item>
          <a-menu-item key="/hrbp/console">转正触发控制台</a-menu-item>
        </a-sub-menu>

        <a-sub-menu key="sub4" v-if="role === 'Approver'">
          <template #title>
            <span>
              <check-square-outlined />
              <span>审批中心</span>
            </span>
          </template>
          <a-menu-item key="/approver/center">我的审批待办</a-menu-item>
        </a-sub-menu>

      </a-menu>
    </a-layout-sider>
    
    <a-layout>
      <a-layout-header class="app-header">
        <a-button type="link" @click="router.push('/dashboard')" class="back-home-btn">
          <home-outlined /> 首页
        </a-button>
        <div class="role-switcher">
          当前演示角色:
          <a-dropdown>
            <a class="ant-dropdown-link" @click.prevent>
              <b class="role-name">{{ roleMap[role] }}</b>
              <down-outlined />
            </a>
            <template #overlay>
              <a-menu @click="handleRoleChange">
                <a-menu-item key="Employee">新员工</a-menu-item>
                <a-menu-item key="Manager">直属主管</a-menu-item>
                <a-menu-item key="HRBP">HRBP</a-menu-item>
                <a-menu-item key="Approver">上级审批人</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
        <a-avatar class="header-avatar"><user-outlined /></a-avatar>
      </a-layout-header>
      
      <a-layout-content class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout-content>
      
      <a-layout-footer class="app-footer">
        试用期转正系统 Demo ©2026
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useProbationStore } from '@/store/probation';
import {
  UserOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  CheckSquareOutlined,
  DownOutlined,
  HomeOutlined
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const store = useProbationStore();

const collapsed = ref<boolean>(false);
const selectedKeys = ref<string[]>([route.path]);

watch(() => route.path, (newPath) => {
  selectedKeys.value = [newPath];
})

const role = computed(() => store.currentUserRole);

const roleMap: Record<string, string> = {
  'Employee': '新员工 王明辉',
  'Manager': '直属上级 陈思远',
  'HRBP': 'HRBP 刘建国',
  'Approver': '审批人'
};

const handleMenuClick = ({ key }: { key: string }) => {
  router.push(key);
};

const handleRoleChange = ({ key }: { key: string }) => {
  store.currentUserRole = key as any;
  // Redirect to corresponding dashboard when role changes
  if (key === 'Employee') router.push('/employee/dashboard');
  if (key === 'Manager') router.push('/manager/team');
  if (key === 'HRBP') router.push('/hrbp/panorama');
  if (key === 'Approver') router.push('/approver/center');
};
</script>

<style scoped>
.logo {
  height: 36px;
  background: #f5f8ff;
  margin: 16px 14px;
  border-radius: 8px;
  overflow: hidden;
}

/* [UI/UX 修复] 将内联样式抽取为 scoped 样式类 */
.main-layout {
  min-height: 100vh;
  background: #f5f7fb;
}

.main-layout :deep(.ant-layout-sider) {
  background: #ffffff;
  border-right: 1px solid #edf1f7;
  box-shadow: none;
}

.main-layout :deep(.ant-layout-sider-trigger) {
  background: #ffffff;
  color: #64748b;
  border-top: 1px solid #edf1f7;
}

.main-layout :deep(.ant-menu-light) {
  border-inline-end: 0;
}

.main-layout :deep(.ant-menu-item),
.main-layout :deep(.ant-menu-submenu-title) {
  border-radius: 8px;
  margin-inline: 10px;
  width: calc(100% - 20px);
}

.main-layout :deep(.ant-menu-item-selected) {
  background: #eef5ff;
  color: #2563eb;
}

.logo-title {
  color: #1f2a44;
  margin: 0;
  padding-left: 14px;
  line-height: 36px;
  font-size: 15px;
  font-weight: 700;
}

.app-header {
  background: rgba(255, 255, 255, 0.92);
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #edf1f7;
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.back-home-btn {
  font-size: 14px;
  color: #64748b;
}

.back-home-btn:hover {
  color: #2563eb;
}

.role-switcher {
  margin-right: 16px;
}

.role-name {
  color: #2563eb;
  font-size: 14px;
}

.header-avatar {
  background-color: #e8f1ff;
  color: #2563eb;
}

.app-content {
  margin: 0;
  background: #f5f7fb;
  padding: 24px;
  min-height: 280px;
  overflow: auto;
}

.app-footer {
  text-align: center;
  background: #f5f7fb;
  color: #94a3b8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
