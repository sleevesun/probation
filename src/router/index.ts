import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        component: MainLayout,
        redirect: '/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('@/views/Dashboard.vue'),
                meta: { title: '首页' }
            },
            // Employee routes
            {
                path: 'employee/dashboard',
                name: 'EmployeeDashboard',
                component: () => import('@/views/employee/Dashboard.vue'),
                meta: { title: '我的试用期' }
            },
            {
                path: 'employee/goals',
                name: 'GoalSetting',
                component: () => import('@/views/employee/GoalSetting.vue'),
                meta: { title: '目标设定' }
            },
            {
                path: 'employee/self-eval',
                name: 'SelfEvaluation',
                component: () => import('@/views/employee/SelfEvaluation.vue'),
                meta: { title: '试用期自评' }
            },
            // Manager routes
            {
                path: 'manager/team',
                name: 'ManagerDashboard',
                component: () => import('@/views/manager/Dashboard.vue'),
                meta: { title: '团队管理' }
            },
            {
                path: 'manager/evaluation/:id',
                name: 'ManagerEvaluation',
                component: () => import('@/views/manager/Evaluation.vue'),
                meta: { title: '转正评价' }
            },
            // HRBP routes
            {
                path: 'hrbp/panorama',
                name: 'HRBPPanorama',
                component: () => import('@/views/hrbp/Panorama.vue'),
                meta: { title: '试用期全景' }
            },
            {
                path: 'hrbp/console',
                name: 'HRBPConsole',
                component: () => import('@/views/hrbp/TriggerConsole.vue'),
                meta: { title: '转正触发控制台' }
            },
            // Approver routes
            {
                path: 'approver/center',
                name: 'ApprovalCenter',
                component: () => import('@/views/approver/ApprovalCenter.vue'),
                meta: { title: '审批中心' }
            }
        ]
    },
    // Email Demo Route (Outside MainLayout)
    {
        path: '/email-demo',
        name: 'EmailDemo',
        component: () => import('@/views/email/EmailDemo.vue'),
        meta: { title: '邮件通知预览台' }
    },
    // Token Interceptor Route
    {
        path: '/auth/token',
        name: 'TokenAuth',
        component: () => import('@/views/email/TokenAuth.vue'),
        meta: { title: 'Token 验证中...' }
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
