<template>
  <component :is="theme === 'ps' ? EmailDemoPS : EmailDemoModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmailDemoModern from '@/views/email/EmailDemo.vue'
import EmailDemoPS from '@/views/ps/email/EmailDemoPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
