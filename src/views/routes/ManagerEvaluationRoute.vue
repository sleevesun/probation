<template>
  <component :is="theme === 'ps' ? ManagerEvaluationPS : ManagerEvaluationModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ManagerEvaluationModern from '@/views/manager/Evaluation.vue'
import ManagerEvaluationPS from '@/views/ps/manager/ManagerEvaluationPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
