<template>
  <div class="ps-page ps-page--standalone">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">Token 验证</div>
        <div class="ps-page__subtitle">使用轻量 PS 外观包裹认证反馈，不接入完整左侧导航。</div>
      </div>
    </div>

    <section class="ps-panel">
      <TokenAuthModern />
    </section>
  </div>
</template>

<script setup lang="ts">
import TokenAuthModern from '@/views/email/TokenAuth.vue'
</script>
