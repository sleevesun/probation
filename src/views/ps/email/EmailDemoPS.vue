<template>
  <div class="ps-page ps-page--standalone">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">邮件通知预览</div>
        <div class="ps-page__subtitle">保留邮件 demo 功能，但外观切换为 PS 风格容器。</div>
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
