<template>
  <component :is="theme === 'ps' ? ApprovalCenterPS : ApprovalCenterModern" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ApprovalCenterModern from '@/views/approver/ApprovalCenter.vue'
import ApprovalCenterPS from '@/views/ps/approver/ApprovalCenterPS.vue'
import { useThemeStore } from '@/store/theme'

const theme = computed(() => useThemeStore().theme)
</script>
