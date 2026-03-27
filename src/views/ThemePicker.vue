<template>
  <div class="theme-picker">
    <div class="theme-picker__hero">
      <div class="theme-picker__eyebrow">Probation Product Demo</div>
      <h1>选择体验风格</h1>
      <p>同一套产品逻辑，分别以现代化 SaaS 界面和 PeopleSoft 风格界面进行展示。</p>
    </div>

    <div class="theme-picker__choices">
      <button class="theme-picker__card theme-picker__card--modern" @click="enterTheme('modern')">
        <span class="theme-picker__badge">Modern</span>
        <h2>现代样式</h2>
        <p>保留当前 Demo 的现代化卡片、彩色标签和高信息密度交互。</p>
        <span class="theme-picker__action">进入现代方案</span>
      </button>

      <button class="theme-picker__card theme-picker__card--ps" @click="enterTheme('ps')">
        <span class="theme-picker__badge">PeopleSoft</span>
        <h2>PS 样式</h2>
        <p>切换为传统 HR 工作台风格，采用左侧导航、页签、表格和分区表单组织信息。</p>
        <span class="theme-picker__action">进入 PS 方案</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore, type DemoTheme } from '@/store/theme'

const router = useRouter()
const themeStore = useThemeStore()

function enterTheme(theme: DemoTheme) {
  themeStore.setTheme(theme)
  router.push('/dashboard')
}
</script>
