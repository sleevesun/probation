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

    <!-- 文档入口区 -->
    <section class="home__section">
      <div class="home__section-header">
        <h2 class="home__section-title">📄 产品文档</h2>
      </div>
      <div class="home__demo-grid">
        <button class="home__demo-card home__demo-card--prd" @click="openPrd">
          <span class="home__demo-badge home__demo-badge--prd">PRD</span>
          <h3>产品需求文档</h3>
          <p>试用期管理及转正审批系统产品需求文档 (V4.19)</p>
        </button>

        <button class="home__demo-card home__demo-card--notification" @click="openNotification">
          <span class="home__demo-badge home__demo-badge--notification">通知</span>
          <h3>通知与待办梳理</h3>
          <p>试用期管理通知矩阵与渠道规则 (V2.0)</p>
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

function openPrd() {
  router.push('/prd')
}

function openNotification() {
  router.push('/notification')
}
</script>

<style scoped>
/* ====== Apple-Style Landing Page ====== */
.home {
  min-height: 100vh;
  background: var(--bg-secondary);
  padding: 64px 24px;
  font-family: var(--font-family);
}

/* ====== Hero ====== */
.home__hero {
  text-align: center;
  margin-bottom: 64px;
}

.home__hero-inner {
  max-width: 720px;
  margin: 0 auto;
}

.home__title {
  font-size: 48px;
  line-height: 1.08;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.03em;
}

/* ====== Section ====== */
.home__section {
  max-width: 980px;
  margin: 0 auto 56px;
  padding: 0;
}

.home__section-header {
  margin-bottom: 20px;
}

.home__section-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  letter-spacing: -0.02em;
}

/* ====== Demo Cards ====== */
.home__demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.home__demo-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  text-align: left;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-default);
  font-family: inherit;
  color: inherit;
  box-shadow: var(--shadow-xs);
}

.home__demo-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.home__demo-card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.home__demo-card--modern {
  border-left: 3px solid var(--accent);
}

.home__demo-card--email {
  border-left: 3px solid var(--status-success);
}

.home__demo-card--prd {
  border-left: 3px solid var(--color-purple);
}

.home__demo-card--notification {
  border-left: 3px solid var(--status-warning);
}

.home__demo-badge {
  display: inline-block;
  margin-bottom: 12px;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 12px;
  font-weight: 500;
}

.home__demo-card--email .home__demo-badge {
  background: var(--status-success-bg);
  color: #1b8a3e;
}

.home__demo-badge--prd {
  background: var(--color-purple-bg) !important;
  color: var(--color-purple) !important;
}

.home__demo-badge--notification {
  background: var(--status-warning-bg) !important;
  color: #b36b00 !important;
}

.home__demo-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: -0.01em;
}

.home__demo-card p {
  font-size: 14px;
  line-height: 1.43;
  color: var(--text-secondary);
  margin: 0;
}

/* ====== Footer ====== */
.home__footer {
  max-width: 980px;
  margin: 0 auto;
  padding: 24px 0 48px;
  text-align: center;
  color: var(--text-tertiary);
  font-size: 12px;
  border-top: 1px solid var(--border-tertiary);
}

/* ====== Responsive ====== */
@media (max-width: 768px) {
  .home {
    padding: 32px 16px;
  }

  .home__title {
    font-size: 32px;
  }

  .home__section {
    margin-bottom: 40px;
  }

  .home__demo-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .home__title {
    font-size: 28px;
  }
}
</style>
