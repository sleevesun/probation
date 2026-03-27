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
      </aside>

      <main class="ps-layout__main">
        <div class="ps-layout__crumbs">
          <span v-for="(crumb, index) in breadcrumbs" :key="crumb + index" class="ps-layout__crumb">
            <span>{{ crumb }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="ps-layout__crumb-sep">/</span>
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
import { useProbationStore } from '@/store/probation'

type RoleKey = 'Employee' | 'Manager' | 'HRBP' | 'Approver'

const router = useRouter()
const route = useRoute()
const probationStore = useProbationStore()

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
  '/hrbp/console': ['首页', 'HRG自助', '流程触发控制台'],
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
        { label: '团队试用期看板', path: '/manager/team' },
        { label: '转正评估', path: '/manager/evaluation/M005' }
      ]
    }
  ],
  HRBP: [
    {
      title: 'HRG自助',
      items: [
        { label: '转正管理', path: '/hrbp/panorama' },
        { label: '流程触发控制台', path: '/hrbp/console' }
      ]
    }
  ],
  Approver: [
    {
      title: '流程审批',
      items: [
        { label: '审批中心', path: '/approver/center' }
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
</script>
