<template>
  <div v-if="annotation" class="prd-annotation-anchor">
    <slot />
    <button
      ref="badgeRef"
      class="prd-annotation-badge"
      type="button"
      :aria-label="`PRD 需求 ${annotation.id}`"
      @mouseenter="openTooltip"
      @focus="openTooltip"
    >
      {{ annotation.id }}
    </button>
  </div>
  <slot v-else />

  <Teleport to="body">
    <div
      v-if="annotation && isOpen"
      ref="tooltipRef"
      class="prd-annotation-tooltip"
      :style="tooltipStyle"
      role="dialog"
      :aria-label="`PRD 需求 ${annotation.id}`"
    >
      <div class="prd-annotation-tooltip__bar" @mousedown.prevent="startDrag">
        <span class="prd-annotation-tooltip__badge">{{ annotation.id }}</span>
        <span class="prd-annotation-tooltip__title">{{ annotation.moduleName }}</span>
        <button class="prd-annotation-tooltip__close" type="button" aria-label="关闭 PRD 标注" @click="closeTooltip">×</button>
      </div>
      <div class="prd-annotation-tooltip__meta">
        <div><strong>PRD 位置：</strong>{{ annotation.sourcePrdHeading }}</div>
        <div><strong>页面定位：</strong>{{ annotation.target }}</div>
      </div>
      <div class="prd-annotation-tooltip__excerpt">{{ annotation.sourcePrdExcerpt }}</div>
      <div class="prd-annotation-tooltip__body" v-html="renderedMarkdown"></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue';
import annotations from '@/config/prd-annotations.json';

interface PrdAnnotationItem {
  id: number;
  moduleName: string;
  target: string;
  sourcePrdHeading: string;
  sourcePrdExcerpt: string;
  tooltipMarkdown: string;
  status: 'mapped' | 'ambiguous' | 'missing';
}

const props = defineProps<{
  id: number | string;
}>();

const annotationMap = new Map<number, PrdAnnotationItem>(
  (annotations as PrdAnnotationItem[]).map(item => [item.id, item])
);

const annotation = computed(() => annotationMap.get(Number(props.id)));
const badgeRef = ref<HTMLElement | null>(null);
const tooltipRef = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const position = ref({ x: 0, y: 0 });
const dragOffset = ref({ x: 0, y: 0 });
const dragging = ref(false);

const tooltipStyle = computed<CSSProperties>(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}));

const renderedMarkdown = computed(() => renderMarkdown(annotation.value?.tooltipMarkdown || ''));

function openTooltip() {
  isOpen.value = true;
  nextTick(placeTooltip);
}

function closeTooltip() {
  isOpen.value = false;
}

function placeTooltip() {
  const badge = badgeRef.value;
  if (!badge) return;

  const rect = badge.getBoundingClientRect();
  const width = 450;
  const margin = 16;
  const estimatedHeight = tooltipRef.value?.offsetHeight || 260;

  let x = rect.left;
  let y = rect.bottom + 8;

  if (x + width + margin > window.innerWidth) {
    x = window.innerWidth - width - margin;
  }
  if (y + estimatedHeight + margin > window.innerHeight) {
    y = rect.top - estimatedHeight - 8;
  }

  position.value = {
    x: Math.max(margin, x),
    y: Math.max(margin, y)
  };
}

function startDrag(event: MouseEvent) {
  dragging.value = true;
  dragOffset.value = {
    x: event.clientX - position.value.x,
    y: event.clientY - position.value.y
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
}

function onDrag(event: MouseEvent) {
  if (!dragging.value) return;
  const width = 450;
  const height = tooltipRef.value?.offsetHeight || 220;
  position.value = {
    x: clamp(event.clientX - dragOffset.value.x, 8, window.innerWidth - width - 8),
    y: clamp(event.clientY - dragOffset.value.y, 8, window.innerHeight - height - 8)
  };
}

function stopDrag() {
  dragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function renderMarkdown(markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      return;
    }

    if (trimmed.startsWith('### ')) {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
      html.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        html.push('<ul>');
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(trimmed.slice(2))}</li>`);
      return;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  });

  if (inList) html.push('</ul>');
  return html.join('');
}

watch(isOpen, open => {
  if (open) window.addEventListener('resize', placeTooltip);
  else window.removeEventListener('resize', placeTooltip);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', placeTooltip);
  stopDrag();
});
</script>

<style scoped>
.prd-annotation-anchor {
  position: relative;
  display: block;
}

.prd-annotation-badge {
  position: absolute;
  top: -8px;
  right: -4px;
  z-index: 9998;
  min-width: 16px;
  height: 14px;
  padding: 0 4px;
  border: 0;
  border-radius: 2px;
  background: rgb(250, 173, 20);
  color: #1f2937;
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  cursor: help;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
}

.prd-annotation-tooltip {
  position: fixed;
  z-index: 9999;
  width: 450px;
  max-width: calc(100vw - 32px);
  overflow: hidden;
  border-radius: 4px;
  background: #f0efef;
  color: #1f2937;
  line-height: 1.6;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.28);
}

.prd-annotation-tooltip__bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(255, 255, 255, 0.45);
  cursor: move;
  user-select: none;
}

.prd-annotation-tooltip__badge {
  min-width: 20px;
  padding: 0 5px;
  border-radius: 2px;
  background: rgb(250, 173, 20);
  color: #111827;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.prd-annotation-tooltip__title {
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prd-annotation-tooltip__close {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #4b5563;
  font-size: 18px;
  line-height: 20px;
  cursor: pointer;
}

.prd-annotation-tooltip__close:hover {
  background: rgba(15, 23, 42, 0.08);
}

.prd-annotation-tooltip__meta,
.prd-annotation-tooltip__excerpt,
.prd-annotation-tooltip__body {
  padding: 10px 12px;
}

.prd-annotation-tooltip__meta {
  display: grid;
  gap: 4px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  color: #4b5563;
  font-size: 12px;
}

.prd-annotation-tooltip__excerpt {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.32);
  font-size: 13px;
}

.prd-annotation-tooltip__body {
  max-height: 280px;
  overflow: auto;
  font-size: 13px;
}

.prd-annotation-tooltip__body :deep(h3) {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
}

.prd-annotation-tooltip__body :deep(p) {
  margin: 0 0 8px;
}

.prd-annotation-tooltip__body :deep(ul) {
  margin: 0 0 8px;
  padding-left: 18px;
}

.prd-annotation-tooltip__body :deep(li) {
  margin-bottom: 4px;
}

.prd-annotation-tooltip__body :deep(code) {
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(15, 23, 42, 0.08);
}
</style>
