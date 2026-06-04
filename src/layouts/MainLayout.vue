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
        <a-menu-item-group key="group-employee" v-if="role === 'Employee'">
          <template #title><user-outlined /> 员工</template>
          <a-menu-item key="/employee/dashboard">我的试用期</a-menu-item>
          <a-menu-item key="/employee/goals">目标设定</a-menu-item>
          <a-menu-item key="/employee/self-eval">试用期自评</a-menu-item>
        </a-menu-item-group>

        <a-menu-item-group key="group-manager" v-if="role === 'Manager'">
          <template #title><team-outlined /> 上级</template>
          <a-menu-item key="/manager/team">试用期管理</a-menu-item>
        </a-menu-item-group>

        <a-menu-item-group key="group-hrbp" v-if="role === 'HRBP'">
          <template #title><safety-certificate-outlined /> HRBP</template>
          <a-menu-item key="/hrbp/panorama">试用期管理</a-menu-item>
        </a-menu-item-group>

        <a-menu-item-group key="group-approver" v-if="role === 'Approver'">
          <template #title><check-square-outlined /> 审批</template>
          <a-menu-item key="/approver/center">试用期转正审批</a-menu-item>
        </a-menu-item-group>
      </a-menu>

      <!-- 演示状态切换组件（仅员工角色可见） -->
      <div v-if="role === 'Employee'" class="sidebar-employee-switcher">
        <div class="sidebar-switcher-label">演示状态切换</div>
        <a-select
          :value="store.currentEmpId"
          size="small"
          style="width: 100%"
          @change="handleEmpChange"
          placeholder="请选择状态"
        >
          <a-select-option
            v-for="emp in employeeOptions"
            :key="emp.emp_id"
            :value="emp.emp_id"
          >
            {{ emp.statusLabel }}
          </a-select-option>
        </a-select>
      </div>
    </a-layout-sider>
    
    <a-layout>
      <a-layout-header class="app-header">
        <a-button type="link" @click="goHome" class="back-home-btn">
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
                <a-menu-item key="Manager">直属上级</a-menu-item>
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
import { useProbationStore, STATUS_MAP } from '@/store/probation';
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

const employeeOptions = computed(() => {
  return store.records.map(r => ({
    emp_id: r.emp_id,
    emp_name: r.emp_name,
    statusLabel: r.return_comment && r.probation_status === '01'
      ? '目标被退回'
      : (STATUS_MAP[r.probation_status] || r.probation_status)
  }))
})

function handleEmpChange(empId: string) {
  store.setCurrentEmpId(empId)
}

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

const goHome = () => {
  router.push('/');
};
</script>

<style scoped>
.logo {
  height: 36px;
  background: var(--modern-bg-surface);
  margin: var(--modern-spacing-md) var(--modern-spacing-md);
  border-radius: var(--modern-radius-md);
  overflow: hidden;
}

.sidebar-employee-switcher {
  padding: var(--modern-spacing-md);
  border-top: 1px solid var(--modern-border-light);
  margin-top: var(--modern-spacing-sm);
}

.sidebar-switcher-label {
  font-size: 12px;
  color: var(--modern-text-muted);
  margin-bottom: var(--modern-spacing-xs);
  font-weight: 600;
}

/* [UI/UX 修复] 将内联样式抽取为 scoped 样式类 */
.main-layout {
  min-height: 100vh;
  background: var(--modern-bg-page);
}

.main-layout :deep(.ant-layout-sider) {
  background: var(--modern-bg-card);
  border-right: 1px solid var(--modern-border-light);
  box-shadow: none;
}

.main-layout :deep(.ant-layout-sider-trigger) {
  background: var(--modern-bg-card);
  color: var(--modern-text-muted);
  border-top: 1px solid var(--modern-border-light);
}

.main-layout :deep(.ant-menu-light) {
  border-inline-end: 0;
}

.main-layout :deep(.ant-menu-item),
.main-layout :deep(.ant-menu-submenu-title) {
  border-radius: var(--modern-radius-md);
  margin-inline: var(--modern-spacing-sm);
  width: calc(100% - 16px);
  padding-inline: var(--modern-spacing-md);
}

.main-layout :deep(.ant-menu-item-selected) {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}

.logo-title {
  color: var(--modern-text-primary);
  margin: 0;
  padding-left: var(--modern-spacing-md);
  line-height: 36px;
  font-size: 15px;
  font-weight: 700;
}

.app-header {
  background: var(--modern-bg-card);
  padding: 0 var(--modern-spacing-lg);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--modern-border-light);
  box-shadow: none;
  backdrop-filter: blur(12px);
}

.back-home-btn {
  font-size: 14px;
  color: var(--modern-text-muted);
}

.back-home-btn:hover {
  color: var(--color-primary);
}

.role-switcher {
  margin-right: var(--modern-spacing-md);
  color: var(--modern-text-secondary);
  font-size: 14px;
}

.role-name {
  color: var(--color-primary);
  font-size: 14px;
}

.header-avatar {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.app-content {
  margin: 0;
  background: var(--modern-bg-page);
  padding: var(--modern-spacing-lg);
  min-height: 280px;
  overflow: auto;
  max-width: 1400px;
  width: 100%;
}

.app-footer {
  text-align: center;
  background: var(--modern-bg-page);
  color: var(--modern-text-muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式支持 */
@media (max-width: 768px) {
  .main-layout :deep(.ant-layout-sider) {
    position: fixed;
    z-index: 1000;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .main-layout :deep(.ant-layout-sider.ant-layout-sider-collapsed) {
    transform: translateX(0);
  }

  .app-content {
    padding: var(--modern-spacing-md);
  }
}
</style>
