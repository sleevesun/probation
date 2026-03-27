import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import ThemeLayout from '@/layouts/ThemeLayout.vue'
import ThemePicker from '@/views/ThemePicker.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'ThemePicker',
    component: ThemePicker
  },
  {
    path: '/dashboard',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/routes/DashboardRoute.vue')
      }
    ]
  },
  {
    path: '/employee/dashboard',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'EmployeeDashboard',
        component: () => import('@/views/routes/EmployeeDashboardRoute.vue')
      }
    ]
  },
  {
    path: '/employee/goals',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'GoalSetting',
        component: () => import('@/views/routes/GoalSettingRoute.vue')
      }
    ]
  },
  {
    path: '/employee/self-eval',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'SelfEvaluation',
        component: () => import('@/views/routes/SelfEvaluationRoute.vue')
      }
    ]
  },
  {
    path: '/manager/team',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'ManagerDashboard',
        component: () => import('@/views/routes/ManagerDashboardRoute.vue')
      }
    ]
  },
  {
    path: '/manager/evaluation/:id',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'ManagerEvaluation',
        component: () => import('@/views/routes/ManagerEvaluationRoute.vue')
      }
    ]
  },
  {
    path: '/hrbp/panorama',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'HRBPPanorama',
        component: () => import('@/views/routes/HRBPPanoramaRoute.vue')
      }
    ]
  },
  {
    path: '/hrbp/console',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'HRBPConsole',
        component: () => import('@/views/routes/HRBPConsoleRoute.vue')
      }
    ]
  },
  {
    path: '/approver/center',
    component: ThemeLayout,
    children: [
      {
        path: '',
        name: 'ApprovalCenter',
        component: () => import('@/views/routes/ApprovalCenterRoute.vue')
      }
    ]
  },
  {
    path: '/email-demo',
    name: 'EmailDemo',
    component: () => import('@/views/routes/EmailDemoRoute.vue')
  },
  {
    path: '/auth/token',
    name: 'TokenAuth',
    component: () => import('@/views/routes/TokenAuthRoute.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
