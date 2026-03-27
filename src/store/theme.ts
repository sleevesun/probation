import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type DemoTheme = 'modern' | 'ps'

const STORAGE_KEY = 'probation-demo-theme'

export const useThemeStore = defineStore('theme', () => {
  const savedTheme = typeof window !== 'undefined'
    ? (localStorage.getItem(STORAGE_KEY) as DemoTheme | null)
    : null

  const theme = ref<DemoTheme | null>(savedTheme === 'modern' || savedTheme === 'ps' ? savedTheme : null)

  const hasTheme = computed(() => theme.value !== null)

  function setTheme(nextTheme: DemoTheme) {
    theme.value = nextTheme
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextTheme)
      document.documentElement.setAttribute('data-demo-theme', nextTheme)
    }
  }

  function initTheme() {
    if (theme.value && typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-demo-theme', theme.value)
    } else if (typeof window !== 'undefined') {
      document.documentElement.removeAttribute('data-demo-theme')
    }
  }

  return {
    theme,
    hasTheme,
    setTheme,
    initTheme
  }
})
