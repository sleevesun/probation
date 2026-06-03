<template>
  <div class="home">
    <!-- Hero 区域 -->
    <section class="home__hero">
      <div class="home__hero-inner">
        <span class="home__eyebrow">Probation Management</span>
        <h1 class="home__title">试用期管理诊断 & 方案探讨</h1>
      </div>
    </section>

    <!-- 方案资料区 -->
    <section class="home__section">
      <div class="home__section-header">
        <h2 class="home__section-title">📄 方案资料</h2>
      </div>
      <div class="home__resource-grid">
        <a
          v-for="item in resources"
          :key="item.id"
          class="home__resource-card"
          :class="`home__resource-card--${item.styleVariant || 'doc'}`"
          :href="item.href"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
        >
          <div class="home__resource-cover">
            <img :src="item.cover" :alt="item.title" loading="lazy" />
          </div>
          <div class="home__resource-body">
            <h3 class="home__resource-title">{{ item.title }}</h3>
            <p class="home__resource-desc">{{ item.description }}</p>
            <span class="home__resource-action">
              {{ item.actionText }}
              <svg v-if="item.external" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </span>
          </div>
        </a>
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
          <h3>现代样式</h3>
          <p>现代化 SaaS 界面，卡片布局、彩色标签和高信息密度交互。</p>
          <span class="home__demo-action">进入现代方案 →</span>
        </button>

        <button class="home__demo-card home__demo-card--ps" @click="enterTheme('ps')">
          <span class="home__demo-badge">PeopleSoft</span>
          <h3>PS 样式</h3>
          <p>传统 HR 工作台风格，左侧导航、页签、表格和分区表单。</p>
          <span class="home__demo-action">进入 PS 方案 →</span>
        </button>

        <button class="home__demo-card home__demo-card--email" @click="openEmailDemo">
          <span class="home__demo-badge">Email Demo</span>
          <h3>邮件通知演示</h3>
          <p>验证待办邮件通知与 Token 深链登录流程。</p>
          <span class="home__demo-action">进入邮件概览 →</span>
        </button>
      </div>
    </section>

    <!-- 底部说明 -->
    <footer class="home__footer">
      <p>本 Demo 用于试用期转正管理方案的内部汇报与讨论，数据均为模拟数据。</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useThemeStore, type DemoTheme } from '@/store/theme'
import { resourceEntries } from '@/config/resources'

const router = useRouter()
const themeStore = useThemeStore()

const resources = resourceEntries

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
/* ====== 页面基础 ====== */
.home {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(64, 128, 255, 0.08), transparent 40%),
    radial-gradient(circle at top right, rgba(124, 58, 237, 0.06), transparent 40%),
    linear-gradient(180deg, #fbfdff 0%, #f4f7fb 100%);
}

/* ====== Hero ====== */
.home__hero {
  padding: 72px 32px 48px;
  text-align: center;
}

.home__hero-inner {
  max-width: 720px;
  margin: 0 auto;
}

.home__eyebrow {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #7b8190;
  margin-bottom: 12px;
}

.home__title {
  font-size: 42px;
  line-height: 1.15;
  font-weight: 800;
  color: #1f2a44;
  margin: 0;
}

/* ====== Section 通用 ====== */
.home__section {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 32px 48px;
}

.home__section-header {
  margin-bottom: 24px;
}

.home__section-title {
  font-size: 22px;
  font-weight: 700;
  color: #1f2a44;
  margin: 0;
}

/* ====== 资源卡片 ====== */
.home__resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.home__resource-card {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5ebf3;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.home__resource-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(35, 44, 72, 0.1);
}

.home__resource-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f0f2f5;
}

.home__resource-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.home__resource-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.home__resource-title {
  font-size: 17px;
  font-weight: 700;
  color: #1f2a44;
  margin: 0 0 8px;
}

.home__resource-desc {
  font-size: 13px;
  color: #58606d;
  line-height: 1.5;
  margin: 0 0 16px;
  flex: 1;
}

.home__resource-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #2563eb;
}

.home__resource-card--ppt {
  border-top: 3px solid #7c3aed;
}

.home__resource-card--flow {
  border-top: 3px solid #059669;
}

/* ====== Demo 入口卡片 ====== */
.home__demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.home__demo-card {
  border: 1px solid #e5ebf3;
  border-radius: 12px;
  padding: 24px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  font-family: inherit;
}

.home__demo-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(35, 44, 72, 0.1);
}

.home__demo-card--modern {
  background: linear-gradient(180deg, #ffffff 0%, #f5f9ff 100%);
  color: #1f2a44;
}

.home__demo-card--ps {
  background: linear-gradient(180deg, #fffaf8 0%, #f2f2f2 100%);
  color: #352f2f;
}

.home__demo-card--email {
  background: linear-gradient(180deg, #f6fff3 0%, #edf8f0 100%);
  color: #213547;
}

.home__demo-badge {
  display: inline-block;
  margin-bottom: 14px;
  padding: 3px 10px;
  border-radius: 999px;
  background: #eef5ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.home__demo-card--ps .home__demo-badge {
  background: rgba(255, 143, 143, 0.18);
  color: #c9151e;
}

.home__demo-card--email .home__demo-badge {
  background: rgba(82, 196, 26, 0.15);
  color: #2d7a1f;
}

.home__demo-card h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px;
}

.home__demo-card p {
  font-size: 13px;
  line-height: 1.5;
  color: #58606d;
  margin: 0 0 16px;
}

.home__demo-action {
  display: inline-block;
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
}

/* ====== Footer ====== */
.home__footer {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 32px 48px;
  text-align: center;
  color: #8a97a8;
  font-size: 12px;
  border-top: 1px solid #edf1f7;
}

/* ====== 响应式 ====== */
@media (max-width: 768px) {
  .home__hero {
    padding: 48px 20px 32px;
  }

  .home__title {
    font-size: 28px;
  }

  .home__subtitle {
    font-size: 15px;
  }

  .home__section {
    padding: 0 20px 36px;
  }

  .home__resource-grid {
    grid-template-columns: 1fr;
  }

  .home__demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
