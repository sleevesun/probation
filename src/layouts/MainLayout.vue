<template>
  <a-layout style="min-height: 100vh">
    <a-layout-sider v-model:collapsed="collapsed" collapsible>
      <div class="logo">
        <h2 v-if="!collapsed" style="color: white; margin: 0; padding-left: 16px; line-height: 32px">试用期转正系统</h2>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        theme="dark"
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
      <a-layout-header style="background: #fff; padding: 0 16px; display: flex; justify-content: flex-end; align-items: center; box-shadow: 0 1px 4px rgba(0,21,41,.08)">
        <div style="margin-right: 16px">
          当前演示角色: 
          <a-dropdown>
            <a class="ant-dropdown-link" @click.prevent>
              <b style="color: #1890ff; font-size: 16px;">{{ roleMap[role] }}</b>
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
        <a-avatar style="background-color: #87d068"><user-outlined /></a-avatar>
      </a-layout-header>
      
      <a-layout-content style="margin: 16px; background: #fff; padding: 24px; min-height: 280px; overflow: auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout-content>
      
      <a-layout-footer style="text-align: center">
        Probation Evaluation System Demo ©2026 Created by Antigravity
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
  DownOutlined
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
  'Employee': '👨‍💻 新员工 (张三 E1001)',
  'Manager': '👔 直属主管 (李四)',
  'HRBP': '🛡️ HRBP (王五)',
  'Approver': '👑 高管审批人'
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
  height: 32px;
  background: rgba(255, 255, 255, 0.2);
  margin: 16px;
  border-radius: 6px;
  overflow: hidden;
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
