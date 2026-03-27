<template>
  <component :is="theme === 'ps' ? SelfEvaluationPS : SelfEvaluationModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SelfEvaluationModern from '@/views/employee/SelfEvaluation.vue'
import SelfEvaluationPS from '@/views/ps/employee/SelfEvaluationPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
