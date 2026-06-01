<template>
  <div style="padding: 24px; text-align: center">
    <a-typography-title :level="2">欢迎来到试用期管理及转正审批系统 Demo</a-typography-title>
    <p>请选择左侧菜单栏或右上角切换角色进行体验。</p>

    <!-- [UI/UX 修复] 使用响应式断点替代固定 span，适配移动端/平板/桌面 -->
    <a-row :gutter="[16, 16]" style="margin-top: 32px">
      <a-col :xs="24" :sm="12" :md="6">
        <a-card title="新员工端" hoverable @click="router.push('/employee/dashboard')">
          <p>体验目标填报与自评流程</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="6">
        <a-card title="主管端" hoverable @click="router.push('/manager/team')">
          <p>管理团队试用期，并进行评估</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="6">
        <a-card title="HRBP端" hoverable @click="router.push('/hrbp/panorama')">
          <p>纵览全视角，触发转正流程</p>
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :md="6">
        <a-card title="审批人端" hoverable @click="router.push('/approver/center')">
          <p>查看审批待办和审批记录</p>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>
