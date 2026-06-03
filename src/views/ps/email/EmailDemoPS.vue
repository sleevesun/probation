<template>
  <div class="ps-page ps-page--standalone">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">待办与通知预览</div>
        <div class="ps-page__subtitle">保留通知 demo 功能，并以 PS 风格容器展示系统待办与辅助触达。</div>
      </div>
    </div>

    <section class="ps-panel">
      <EmailDemoModern />
    </section>
  </div>
</template>

<script setup lang="ts">
import EmailDemoModern from '@/views/email/EmailDemo.vue'
</script>
