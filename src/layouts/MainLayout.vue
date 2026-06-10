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
          <a-menu-item key="/employee/self-eval">自我评价</a-menu-item>
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
  height: 40px;
  background: transparent;
  margin: var(--space-4) var(--space-4) var(--space-2);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
}

.sidebar-employee-switcher {
  padding: var(--space-4);
  border-top: 1px solid var(--border-tertiary);
  margin-top: auto;
}

.sidebar-switcher-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: var(--space-1);
  font-weight: 500;
}

.main-layout {
  min-height: 100vh;
  background: var(--bg-secondary);
}

.main-layout :deep(.ant-layout-sider) {
  background: var(--bg-primary);
  border-right: 1px solid var(--border-tertiary);
  box-shadow: none;
  transition: all var(--duration-normal) var(--ease-default);
}

.main-layout :deep(.ant-layout-sider-trigger) {
  background: var(--bg-primary);
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-tertiary);
  transition: color var(--duration-fast) var(--ease-default);
}

.main-layout :deep(.ant-layout-sider-trigger:hover) {
  color: var(--text-primary);
}

.main-layout :deep(.ant-menu-light) {
  border-inline-end: 0;
  background: transparent;
}

.main-layout :deep(.ant-menu-item),
.main-layout :deep(.ant-menu-submenu-title) {
  border-radius: var(--radius-md) !important;
  margin-inline: var(--space-2);
  width: calc(100% - 16px);
  padding-inline: var(--space-3) !important;
  height: 36px !important;
  line-height: 36px !important;
  font-size: 14px !important;
  color: var(--text-secondary) !important;
  transition: all var(--duration-fast) var(--ease-default) !important;
}

.main-layout :deep(.ant-menu-item:hover),
.main-layout :deep(.ant-menu-submenu-title:hover) {
  background: var(--bg-grouped) !important;
  color: var(--text-primary) !important;
}

.main-layout :deep(.ant-menu-item-selected) {
  background: var(--accent-bg) !important;
  color: var(--accent) !important;
  font-weight: 500 !important;
}

.main-layout :deep(.ant-menu-item-group-title) {
  padding: var(--space-4) var(--space-3) var(--space-2) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: var(--text-tertiary) !important;
  letter-spacing: 0.02em;
}

.logo-title {
  color: var(--text-primary);
  margin: 0;
  padding-left: var(--space-3);
  line-height: 40px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.app-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  padding: 0 var(--space-6);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-tertiary);
  box-shadow: none;
  height: var(--topbar-height);
  min-height: var(--topbar-height);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-home-btn {
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.back-home-btn:hover {
  color: var(--accent);
}

.role-switcher {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: 14px;
}

.role-name {
  color: var(--accent);
  font-size: 14px;
  font-weight: 500;
}

.header-avatar {
  background-color: var(--accent-bg);
  color: var(--accent);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
}

.app-content {
  margin: 0;
  background: var(--bg-secondary);
  padding: var(--space-6);
  min-height: 280px;
  overflow: auto;
  width: 100%;
}

.app-footer {
  text-align: center;
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: 12px;
  padding: var(--space-6) 0;
}

/* Apple-style fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-normal) var(--ease-default);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Responsive support */
@media (max-width: 768px) {
  .main-layout :deep(.ant-layout-sider) {
    position: fixed;
    z-index: 1000;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform var(--duration-normal) var(--ease-default);
  }

  .main-layout :deep(.ant-layout-sider.ant-layout-sider-collapsed) {
    transform: translateX(0);
  }

  .app-content {
    padding: var(--space-4);
  }

  .app-header {
    padding: 0 var(--space-4);
  }
}
</style>
