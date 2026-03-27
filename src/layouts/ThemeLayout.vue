<template>
  <component :is="theme === 'ps' ? PSLayout : MainLayout" />
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import PSLayout from '@/layouts/PSLayout.vue'
import { useThemeStore } from '@/store/theme'

const router = useRouter()
const themeStore = useThemeStore()

const theme = computed(() => themeStore.theme)

onMounted(() => {
  themeStore.initTheme()
  if (!themeStore.hasTheme) {
    router.replace('/')
  }
})
</script>
