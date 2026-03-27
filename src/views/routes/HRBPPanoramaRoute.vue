<template>
  <component :is="theme === 'ps' ? HRBPPanoramaPS : HRBPPanoramaModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HRBPPanoramaModern from '@/views/hrbp/Panorama.vue'
import HRBPPanoramaPS from '@/views/ps/hrbp/HRBPPanoramaPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
