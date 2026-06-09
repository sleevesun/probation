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
      @click.stop
      @mousedown.stop
    >
      <div class="prd-annotation-tooltip__bar" @mousedown.prevent.stop="startDrag">
        <span class="prd-annotation-tooltip__badge">{{ annotation.id }}</span>
        <a class="prd-annotation-tooltip__title" :href="prdSectionHref">需求描述：{{ annotation.moduleName }}</a>
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import { useRoute } from 'vue-router';
import { marked } from 'marked';
import annotations from '@/config/prd-annotations.json';
import { getPrdSectionHref } from '@/utils/prdNavigation';

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
const instanceToken = Symbol('prd-annotation-instance');
const OPEN_EVENT = 'prd-annotation:open';

const annotation = computed(() => annotationMap.get(Number(props.id)));
const route = useRoute();
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
const prdSectionHref = computed(() => getPrdSectionHref(annotation.value?.sourcePrdHeading || ''));

function openTooltip() {
  window.dispatchEvent(
    new CustomEvent(OPEN_EVENT, {
      detail: { id: annotation.value?.id, token: instanceToken }
    })
  );
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

function renderMarkdown(markdown: string) {
  return marked.parse(markdown, { breaks: true }) as string;
}

function handleOpenEvent(event: Event) {
  const detail = (event as CustomEvent<{ id?: number; token: symbol }>).detail;
  if (!annotation.value || !detail?.id) return;
  if (detail.id === annotation.value.id && detail.token !== instanceToken) {
    isOpen.value = false;
  }
}

function syncWithRouteQuery(prdQuery: unknown) {
  if (!annotation.value) return;
  if (String(prdQuery || '') !== String(annotation.value.id)) return;
  nextTick(() => {
    badgeRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    openTooltip();
  });
}

watch(isOpen, open => {
  if (open) window.addEventListener('resize', placeTooltip);
  else window.removeEventListener('resize', placeTooltip);
});

onMounted(() => {
  window.addEventListener(OPEN_EVENT, handleOpenEvent as EventListener);
  syncWithRouteQuery(route.query.prd);
});

watch(() => route.query.prd, syncWithRouteQuery);

onBeforeUnmount(() => {
  window.removeEventListener('resize', placeTooltip);
  window.removeEventListener(OPEN_EVENT, handleOpenEvent as EventListener);
  stopDrag();
});
</script>

<style scoped>
.prd-annotation-anchor {
  position: relative;
  display: block;
}

.prd-annotation-badge {
  display: inline-block;
  vertical-align: top;
  position: absolute;
  top: -8px;
  right: -4px;
  z-index: 9998;
  padding: 0 4px;
  border: 0;
  border-radius: 2px;
  background: rgb(250, 173, 20);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 14px;
  cursor: pointer;
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
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
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
  color: #fff;
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
  color: inherit;
  text-decoration: none;
}

.prd-annotation-tooltip__title:hover {
  text-decoration: underline;
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

.prd-annotation-tooltip__body :deep(ol) {
  margin: 0 0 8px;
  padding-left: 18px;
}

.prd-annotation-tooltip__body :deep(li) {
  margin-bottom: 4px;
}

.prd-annotation-tooltip__body :deep(blockquote) {
  margin: 0 0 8px;
  padding: 8px 12px;
  border-left: 3px solid rgba(15, 23, 42, 0.18);
  background: rgba(255, 255, 255, 0.4);
}

.prd-annotation-tooltip__body :deep(code) {
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(15, 23, 42, 0.08);
}
</style>
