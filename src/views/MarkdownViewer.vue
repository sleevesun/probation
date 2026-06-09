<template>
  <div class="md-page" :class="{ 'md-page--with-toc': showToc }">
    <aside v-if="showToc" class="md-toc" aria-label="PRD 目录">
      <div class="md-toc__title">目录</div>
      <nav class="md-toc__nav">
        <a
          v-for="item in tocItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="md-toc__link"
          :class="[
            `md-toc__link--level-${item.level}`,
            { 'md-toc__link--active': activeHeading === item.id },
          ]"
          @click.prevent="navigateToHeading(item.id)"
        >
          {{ item.text }}
        </a>
      </nav>
    </aside>

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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { LeftOutlined } from '@ant-design/icons-vue'
import { getPrdHeadingAnchor, renderHeadingWithLinks } from '@/utils/prdNavigation'

const router = useRouter()
const route = useRoute()
const renderedContent = ref('')
const tocItems = ref<Array<{ id: string; text: string; level: number }>>([])
const activeHeading = ref('')

const props = defineProps<{
  file: string
  title: string
  subtitle?: string
}>()

const showToc = computed(() => ['prd.md', 'notification.md'].includes(props.file) && tocItems.value.length > 0)

onMounted(async () => {
  try {
    const response = await fetch(`/${props.file}`)
    const markdown = await response.text()
    if (props.file === 'prd.md' || props.file === 'notification.md') {
      tocItems.value = buildToc(markdown)
    }
    let content = markdown
    if (props.file === 'prd.md') {
      content = enhancePrdMarkdown(markdown)
    } else if (props.file === 'notification.md') {
      content = filterNotificationContent(markdown)
    }
    renderedContent.value = marked(content) as string
    await nextTick()
    scrollToCurrentHash()
    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, { passive: true })
  } catch (error) {
    console.error(`Failed to load ${props.file}:`, error)
    renderedContent.value = '<p>加载文档失败</p>'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', updateActiveHeading)
})

watch(
  () => route.hash,
  async () => {
    await nextTick()
    scrollToCurrentHash()
  },
)

function buildToc(markdown: string) {
  const anchorCounts = new Map<string, number>()

  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (!match) return null

      const level = match[1].length
      const rawText = match[2].trim()
      const id = getUniqueHeadingAnchor(rawText, anchorCounts)
      if (level > 3) return null

      // 过滤掉「变更记录」章节
      if (rawText.includes('变更记录')) return null

      return {
        id,
        text: rawText.replace(/\[(\d+)\]/g, '').replace(/[*_`]/g, '').trim(),
        level,
      }
    })
    .filter((item): item is { id: string; text: string; level: number } => Boolean(item?.id))
}

function enhancePrdMarkdown(markdown: string) {
  const anchorCounts = new Map<string, number>()

  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      if (!match) return line

      const level = match[1].length
      const text = match[2]
      const anchor = getUniqueHeadingAnchor(text, anchorCounts)
      return renderHeadingWithLinks(level, text, anchor)
    })
    .join('\n')
}

function filterNotificationContent(markdown: string) {
  const lines = markdown.split(/\r?\n/)
  let skipSection = false
  const result: string[] = []

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const headingText = match[2].trim()
      // 如果遇到「变更记录」章节，开始跳过
      if (headingText.includes('变更记录')) {
        skipSection = true
        continue
      }
      // 如果遇到新的同级或更高级章节，停止跳过
      if (skipSection && match[1].length <= 2) {
        skipSection = false
      }
    }
    if (!skipSection) {
      result.push(line)
    }
  }

  return result.join('\n')
}

function getUniqueHeadingAnchor(text: string, counts: Map<string, number>) {
  const baseAnchor = getPrdHeadingAnchor(text)
  const count = (counts.get(baseAnchor) ?? 0) + 1
  counts.set(baseAnchor, count)
  return count === 1 ? baseAnchor : `${baseAnchor}-${count}`
}

function navigateToHeading(id: string) {
  const hash = `#${id}`
  if (route.hash !== hash) {
    router.push({ path: route.path, query: route.query, hash })
  } else {
    scrollToHeading(id, 'smooth')
  }
}

function scrollToCurrentHash() {
  const id = decodeURIComponent(route.hash.replace(/^#/, ''))
  if (!id) {
    window.scrollTo({ top: 0 })
    return
  }
  scrollToHeading(id, 'auto')
}

function scrollToHeading(id: string, behavior: ScrollBehavior) {
  const target = document.getElementById(id)
  if (!target) return

  target.scrollIntoView({ behavior, block: 'start' })
  activeHeading.value = id
}

function updateActiveHeading() {
  if (!tocItems.value.length) return

  let current = tocItems.value[0].id
  for (const item of tocItems.value) {
    const element = document.getElementById(item.id)
    if (element && element.getBoundingClientRect().top <= 120) {
      current = item.id
    } else {
      break
    }
  }
  activeHeading.value = current
}
</script>

<style scoped>
.md-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.md-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  min-height: 100vh;
}

.md-page--with-toc .md-container {
  margin-left: 304px;
  margin-right: 24px;
}

.md-toc {
  position: fixed;
  top: 20px;
  bottom: 20px;
  left: 20px;
  z-index: 10;
  width: 260px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}

.md-toc__title {
  padding: 16px 18px 12px;
  color: #111827;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #eef0f3;
}

.md-toc__nav {
  height: calc(100% - 52px);
  padding: 8px 10px 16px;
  overflow-y: auto;
}

.md-toc__link {
  display: block;
  padding: 7px 8px;
  overflow: hidden;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.45;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;
  border-left: 2px solid transparent;
}

.md-toc__link:hover {
  color: #1677ff;
  background: #f5f8ff;
}

.md-toc__link--level-1 {
  color: #111827;
  font-weight: 600;
}

.md-toc__link--level-2 {
  padding-left: 18px;
}

.md-toc__link--level-3 {
  padding-left: 30px;
  color: #6b7280;
}

.md-toc__link--active {
  color: #1677ff;
  font-weight: 600;
  background: #eef5ff;
  border-left-color: #1677ff;
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

.md-content :deep([id]) {
  scroll-margin-top: 24px;
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

.md-content :deep(.prd-ref-link) {
  margin: 0 2px;
  color: #1677ff;
  text-decoration: none;
  font-weight: 600;
}

.md-content :deep(.prd-ref-link:hover) {
  text-decoration: underline;
}

@media (max-width: 1080px) {
  .md-page--with-toc {
    padding: 16px;
  }

  .md-page--with-toc .md-container {
    margin: 0 auto;
  }

  .md-toc {
    position: relative;
    top: auto;
    bottom: auto;
    left: auto;
    width: min(100%, 1200px);
    max-height: 320px;
    margin: 0 auto 16px;
  }

  .md-toc__nav {
    max-height: 260px;
  }
}
</style>
