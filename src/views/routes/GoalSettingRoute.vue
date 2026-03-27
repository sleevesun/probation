<template>
  <component :is="theme === 'ps' ? GoalSettingPS : GoalSettingModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GoalSettingModern from '@/views/employee/GoalSetting.vue'
import GoalSettingPS from '@/views/ps/employee/GoalSettingPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
