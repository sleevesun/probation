<template>
  <div class="md-container">
    <div class="md-header">
      <a-button @click="router.back()" type="link">
        <template #icon><left-outlined /></template>
        返回首页
      </a-button>
      <h1>{{ title }}</h1>
      <div class="md-meta" v-if="subtitle">
        <span>{{ subtitle }}</span>
      </div>
    </div>
    <div class="md-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { marked } from 'marked'
import { LeftOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const renderedContent = ref('')

const props = defineProps<{
  file: string
  title: string
  subtitle?: string
}>()

onMounted(async () => {
  try {
    const response = await fetch(`/${props.file}`)
    const markdown = await response.text()
    renderedContent.value = marked(markdown) as string
  } catch (error) {
    console.error(`Failed to load ${props.file}:`, error)
    renderedContent.value = '<p>加载文档失败</p>'
  }
})
</script>

<style scoped>
.md-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  min-height: 100vh;
}

.md-header {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 16px;
  margin-bottom: 24px;
}

.md-header h1 {
  margin: 8px 0;
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
}

.md-meta {
  display: flex;
  gap: 24px;
  color: #6b7280;
  font-size: 14px;
}

.md-content {
  line-height: 1.8;
  color: #333;
}

.md-content :deep(h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 32px 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.md-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 28px 0 12px;
  color: #1890ff;
}

.md-content :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 8px;
}

.md-content :deep(p) {
  margin: 12px 0;
}

.md-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.md-content :deep(th),
.md-content :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 12px;
  text-align: left;
}

.md-content :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}

.md-content :deep(tr:hover) {
  background: #f9fafb;
}

.md-content :deep(code) {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
}

.md-content :deep(pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.md-content :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}

.md-content :deep(ul),
.md-content :deep(ol) {
  padding-left: 24px;
  margin: 12px 0;
}

.md-content :deep(li) {
  margin: 8px 0;
}

.md-content :deep(blockquote) {
  border-left: 4px solid #1890ff;
  padding: 12px 16px;
  margin: 16px 0;
  background: #f0f5ff;
  color: #333;
}

.md-content :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 16px 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 删除线样式 */
.md-content :deep(del) {
  color: #999;
  text-decoration: line-through;
}
</style>
