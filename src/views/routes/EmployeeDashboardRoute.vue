<template>
  <component :is="theme === 'ps' ? EmployeeDashboardPS : EmployeeDashboardModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import EmployeeDashboardModern from '@/views/employee/Dashboard.vue'
import EmployeeDashboardPS from '@/views/ps/employee/EmployeeDashboardPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
