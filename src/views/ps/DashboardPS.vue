<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">试用期管理产品演示</div>
        <div class="ps-page__subtitle">以 PeopleSoft 风格门户展示员工、主管、HRBP 与审批人四类使用场景。</div>
      </div>
    </div>

    <div class="ps-portal">
      <div class="ps-portal__grid">
        <button v-for="entry in entries" :key="entry.path" class="ps-portal__card" @click="router.push(entry.path)">
          <div class="ps-portal__card-title">{{ entry.title }}</div>
          <div class="ps-portal__card-desc">{{ entry.desc }}</div>
        </button>
      </div>

      <div class="ps-portal__notice">
        <div class="ps-section-title">常用说明</div>
        <ul class="ps-list">
          <li>Modern 版保留现有高信息密度交互；PS 版统一使用列表、页签、表单分区与详情页表达。</li>
          <li>本 Demo 只展示产品逻辑和页面状态，不接入真实流程引擎和后端接口。</li>
          <li>邮件预览和 token 页也支持 PS 外观，便于统一给客户演示。</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const entries = [
  { title: '员工自助', desc: '查看试用期进度、目标设定与自评入口', path: '/employee/dashboard' },
  { title: '主管看板', desc: '集中处理目标确认与转正评估', path: '/manager/team' },
  { title: 'HRBP 转正管理', desc: '按 PeopleSoft 风格展示查询、页签和行内操作', path: '/hrbp/panorama' },
  { title: '审批中心', desc: '展示审批待办与审批历史详情', path: '/approver/center' }
]
</script>
