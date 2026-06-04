<template>
  <div class="ps-layout">
    <header class="ps-layout__header">
      <div class="ps-layout__brand">
        <div class="ps-layout__logo-mark">完美世界</div>
        <div class="ps-layout__brand-tabs">
          <button class="ps-layout__brand-tab ps-layout__brand-tab--active">HR便捷工作台</button>
          <button class="ps-layout__brand-tab">HR小姐姐</button>
        </div>
      </div>

      <div class="ps-layout__header-right">
        <div class="ps-layout__role-switcher">
          <span class="ps-layout__header-label">当前角色</span>
          <a-select
            size="small"
            :value="role"
            style="width: 172px"
            @change="handleRoleChange"
          >
            <a-select-option v-for="item in roles" :key="item.key" :value="item.key">
              {{ item.label }}
            </a-select-option>
          </a-select>
        </div>

        <div class="ps-layout__header-user">
          <span class="ps-layout__header-avatar">admin</span>
          <span>崔婷 | 601577</span>
        </div>
      </div>
    </header>

    <div class="ps-layout__body">
      <aside class="ps-layout__sidebar">
        <div
          v-for="group in visibleMenuGroups"
          :key="group.title"
          class="ps-layout__menu-group"
        >
          <div class="ps-layout__menu-title">{{ group.title }}</div>
          <button
            v-for="item in group.items"
            :key="item.path"
            class="ps-layout__menu-item"
            :class="{ 'ps-layout__menu-item--active': route.path === item.path }"
            @click="router.push(item.path)"
          >
            {{ item.label }}
          </button>
        </div>

        <!-- 演示状态切换组件（仅员工角色可见） -->
        <div v-if="role === 'Employee'" class="ps-sidebar-employee-switcher">
          <div class="ps-sidebar-switcher-label">演示状态切换</div>
          <a-select
            :value="probationStore.currentEmpId"
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
      </aside>

      <main class="ps-layout__main">
        <div class="ps-layout__crumbs">
          <span class="ps-layout__crumb ps-layout__crumb--link" @click="goHome">首页</span>
          <span class="ps-layout__crumb-sep">/</span>
          <span v-for="(crumb, index) in breadcrumbs.slice(1)" :key="crumb + index" class="ps-layout__crumb">
            <span>{{ crumb }}</span>
            <span v-if="index < breadcrumbs.length - 2" class="ps-layout__crumb-sep">/</span>
          </span>
        </div>

        <section class="ps-layout__content">
          <router-view />
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProbationStore, STATUS_MAP } from '@/store/probation'

type RoleKey = 'Employee' | 'Manager' | 'HRBP' | 'Approver'

const router = useRouter()
const route = useRoute()
const probationStore = useProbationStore()

const employeeOptions = computed(() => {
  return probationStore.records.map(r => ({
    emp_id: r.emp_id,
    emp_name: r.emp_name,
    statusLabel: r.return_comment && r.probation_status === '01'
      ? '目标被退回'
      : (STATUS_MAP[r.probation_status] || r.probation_status)
  }))
})

function handleEmpChange(empId: string) {
  probationStore.setCurrentEmpId(empId)
}

const role = computed(() => probationStore.currentUserRole)

const roles: Array<{ key: RoleKey; label: string }> = [
  { key: 'Employee', label: '新员工' },
  { key: 'Manager', label: '直属主管' },
  { key: 'HRBP', label: 'HRBP' },
  { key: 'Approver', label: '审批人' }
]

const routeTitleMap: Record<string, string[]> = {
  '/dashboard': ['首页', '风格入口'],
  '/employee/dashboard': ['首页', '员工自助', '我的试用期'],
  '/employee/goals': ['首页', '员工自助', '目标设定'],
  '/employee/self-eval': ['首页', '员工自助', '自我评价'],
  '/manager/team': ['首页', '流程审批', '团队试用期看板'],
  '/manager/evaluation/:id': ['首页', '流程审批', '转正评估'],
  '/hrbp/panorama': ['首页', 'HRG自助', '转正管理'],
  '/approver/center': ['首页', '流程审批', '审批中心']
}

const menuByRole: Record<RoleKey, Array<{ title: string; items: Array<{ label: string; path: string }> }>> = {
  Employee: [
    {
      title: '员工自助',
      items: [
        { label: '我的试用期', path: '/employee/dashboard' },
        { label: '目标设定', path: '/employee/goals' },
        { label: '自我评价', path: '/employee/self-eval' }
      ]
    }
  ],
  Manager: [
    {
      title: '流程审批',
      items: [
        { label: '试用期管理', path: '/manager/team' },
        { label: '转正评估', path: '/manager/evaluation/M005' }
      ]
    }
  ],
  HRBP: [
    {
      title: 'HRG自助',
      items: [
        { label: '试用期管理', path: '/hrbp/panorama' }
      ]
    }
  ],
  Approver: [
    {
      title: '流程审批',
      items: [
        { label: '试用期转正审批', path: '/approver/center' }
      ]
    }
  ]
}

const visibleMenuGroups = computed(() => menuByRole[role.value])

const breadcrumbs = computed(() => {
  if (route.path.startsWith('/manager/evaluation/')) {
    return routeTitleMap['/manager/evaluation/:id']
  }
  return routeTitleMap[route.path] || ['首页']
})

function handleRoleChange(nextRole: RoleKey) {
  probationStore.currentUserRole = nextRole
  if (nextRole === 'Employee') router.push('/employee/dashboard')
  if (nextRole === 'Manager') router.push('/manager/team')
  if (nextRole === 'HRBP') router.push('/hrbp/panorama')
  if (nextRole === 'Approver') router.push('/approver/center')
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.ps-sidebar-employee-switcher {
  padding: 12px 22px;
  border-top: 1px solid var(--ps-border);
  margin-top: 16px;
}

.ps-sidebar-switcher-label {
  font-size: 12px;
  color: var(--ps-muted);
  margin-bottom: 6px;
  font-weight: 700;
}
</style>
