<template>
  <div class="home">
    <!-- Hero 区域 -->
    <section class="home__hero">
      <div class="home__hero-inner">
        <h1 class="home__title">Demo预览</h1>
      </div>
    </section>

    <!-- Demo 体验入口区 -->
    <section class="home__section">
      <div class="home__section-header">
        <h2 class="home__section-title">🎯 交互原型体验</h2>
      </div>
      <div class="home__demo-grid">
        <button class="home__demo-card home__demo-card--modern" @click="enterTheme('modern')">
          <span class="home__demo-badge">Modern</span>
          <h3>试用期管理Demo</h3>
          <p>现代化 SaaS 界面，卡片布局、彩色标签，支持员工试用期全流程管理。</p>
        </button>

        <button class="home__demo-card home__demo-card--email" @click="openEmailDemo">
          <span class="home__demo-badge">Email Demo</span>
          <h3>通知预览</h3>
          <p>预览试用期转正待办邮件通知样式，支持 Token 深链直接登录。</p>
        </button>
      </div>
    </section>

    <!-- 底部说明 -->
    <footer class="home__footer">
      <p>数据均为模拟数据，仅供内部演示与讨论。</p>
    </footer>
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

function openEmailDemo() {
  if (!themeStore.theme) {
    themeStore.setTheme('modern')
  }
  router.push('/email-demo')
}
</script>

<style scoped>
/* ====== 页面基础 - 飞书 People 风格 ====== */
.home {
  min-height: 100vh;
  background: #F7F8FA;
  padding: 48px 24px;
}

/* ====== Hero ====== */
.home__hero {
  text-align: center;
  margin-bottom: 48px;
}

.home__hero-inner {
  max-width: 720px;
  margin: 0 auto;
}

.home__title {
  font-size: 32px;
  line-height: 1.3;
  font-weight: 700;
  color: #1f2329;
  margin: 0;
  letter-spacing: -0.5px;
}

/* ====== Section 通用 ====== */
.home__section {
  max-width: 1200px;
  margin: 0 auto 48px;
  padding: 0;
}

.home__section-header {
  margin-bottom: 24px;
}

.home__section-title {
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
  margin: 0;
}

/* ====== Demo 入口卡片 ====== */
.home__demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.home__demo-card {
  background: #ffffff;
  border: 1px solid #e5e6eb;
  border-radius: 12px;
  padding: 24px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  color: inherit;
}

.home__demo-card:hover {
  border-color: #1677ff;
  box-shadow: 0 2px 12px rgba(22, 119, 255, 0.08);
  transform: translateY(-2px);
}

.home__demo-card--modern {
  border-left: 3px solid #1677ff;
}

.home__demo-card--email {
  border-left: 3px solid #52c41a;
}

.home__demo-badge {
  display: inline-block;
  margin-bottom: 14px;
  padding: 2px 10px;
  border-radius: 999px;
  background: #e8f3ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 500;
}

.home__demo-card--email .home__demo-badge {
  background: #e8ffea;
  color: #389e0d;
}

.home__demo-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
  margin: 0 0 8px;
}

.home__demo-card p {
  font-size: 14px;
  line-height: 1.5;
  color: #646a73;
  margin: 0;
}

/* ====== Footer ====== */
.home__footer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 0 48px;
  text-align: center;
  color: #8f959e;
  font-size: 12px;
  border-top: 1px solid #e5e6eb;
}

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .home {
    padding: 24px 16px;
  }

  .home__title {
    font-size: 24px;
  }

  .home__section {
    margin-bottom: 36px;
  }

  .home__demo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .home__title {
    font-size: 20px;
  }
}
</style>
