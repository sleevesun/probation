<template>
  <component :is="theme === 'ps' ? TokenAuthPS : TokenAuthModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import TokenAuthModern from '@/views/email/TokenAuth.vue'
import TokenAuthPS from '@/views/ps/email/TokenAuthPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
