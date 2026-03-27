<template>
  <component :is="theme === 'ps' ? DashboardPS : DashboardModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DashboardModern from '@/views/modern/DashboardModern.vue'
import DashboardPS from '@/views/ps/DashboardPS.vue'
import { useThemeStore } from '@/store/theme'

const themeStore = useThemeStore()
const theme = computed(() => themeStore.theme)
</script>
