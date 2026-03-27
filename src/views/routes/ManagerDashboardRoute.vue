<template>
  <component :is="theme === 'ps' ? ManagerDashboardPS : ManagerDashboardModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ManagerDashboardModern from '@/views/manager/Dashboard.vue'
import ManagerDashboardPS from '@/views/ps/manager/ManagerDashboardPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
