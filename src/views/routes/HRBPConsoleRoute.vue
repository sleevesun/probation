<template>
  <component :is="theme === 'ps' ? HRBPConsolePS : HRBPConsoleModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HRBPConsoleModern from '@/views/hrbp/TriggerConsole.vue'
import HRBPConsolePS from '@/views/ps/hrbp/HRBPConsolePS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
