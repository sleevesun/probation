<template>
  <div class="email-demo-container">
    <!-- 左侧列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>待办与通知预览</h3>
        <p class="sidebar-hint">系统待办是流程主驱动，邮件/WOA/OTP 仅作为触达渠道</p>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        style="height: calc(100vh - 120px); overflow-y: auto;"
        @select="onSelectTemplate"
      >
        <a-menu-item-group v-for="group in phaseGroups" :key="group.phase">
          <template #title>
            <span>{{ group.phase }}</span>
            <span class="phase-desc">{{ group.description }}</span>
          </template>
          <a-menu-item
            v-for="t in templates.filter(t => t.phase === group.phase)"
            :key="t.id"
          >
            <a-tag :color="getRoleColor(t.role)" size="small">{{ t.role }}</a-tag> {{ t.title }}
          </a-menu-item>
        </a-menu-item-group>
      </a-menu>
    </div>

    <!-- 中间预览区 -->
    <div class="preview-panel">
      <div class="preview-header">
        <div class="header-left">
          <strong>主题：</strong> {{ currentTemplate?.title }}
        </div>
        <div class="header-right">
          <a-button type="primary" @click="handleSendTestEmail" style="margin-right: 8px;">发送测试邮件</a-button>
          <a-button @click="showConfig = !showConfig">
            {{ showConfig ? '隐藏配置' : '显示配置' }}
          </a-button>
        </div>
      </div>
      <!-- 触发条件与动作说明 -->
      <div v-if="currentTemplate" class="meta-bar">
        <div class="meta-item">
          <span class="meta-label">阶段</span>
          <a-tag color="blue">{{ currentTemplate.phase }}</a-tag>
        </div>
        <div class="meta-item">
          <span class="meta-label">接收角色</span>
          <a-tag :color="getRoleColor(currentTemplate.role)">{{ currentTemplate.role }}</a-tag>
        </div>
        <div class="meta-item">
          <span class="meta-label">触发条件</span>
          <span class="meta-value">{{ currentTemplate.trigger }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">期望动作</span>
          <span class="meta-value">{{ currentTemplate.action }}</span>
        </div>
      </div>
      <div class="preview-content">
        <!-- 使用 iframe 隔离邮件样式，防止与外部 Vue 组件样式冲突 -->
        <iframe :srcdoc="renderedHtml" frameborder="0" width="100%" height="100%"></iframe>
      </div>
    </div>

    <!-- 右侧操作区 (默认折叠) -->
    <div class="operation-panel" :class="{ 'panel-hidden': !showConfig }">
      <a-card title="变量配置" :bordered="false" style="margin-bottom: 16px;">
        <a-form layout="vertical">
          <a-form-item v-for="key in Object.keys(currentVars)" :key="key" :label="key">
            <a-input v-model:value="currentVars[key]" />
          </a-form-item>
        </a-form>
      </a-card>

      <a-card title="生成 Token 链接测试" :bordered="false">
        <p style="color: #666; font-size: 12px; margin-bottom: 16px;">
          此功能用于模拟真实环境下的深度链接（Deep Link）。复制下方链接并在新标签页打开，将模拟验证 Token 并跳转。
        </p>
        <a-input-search
          v-model:value="currentVars.login_url"
          enter-button="复制"
          @search="copyToClipboard"
          readonly
        />
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { emailTemplates, renderEmailSkin, phaseGroups } from './templates';
import { message } from 'ant-design-vue';

const templates = ref(emailTemplates);
const selectedKeys = ref<string[]>([]);
const currentVars = ref<Record<string, string>>({});
const showConfig = ref(false);

// 初始化选中第一个
onMounted(() => {
  if (templates.value.length > 0) {
    selectedKeys.value = [templates.value[0].id];
    currentVars.value = { ...templates.value[0].defaultVars };
  }
});

const currentTemplate = computed(() => {
  return templates.value.find(t => t.id === selectedKeys.value[0]);
});

const renderedHtml = computed(() => {
  if (!currentTemplate.value) return '';
  const body = currentTemplate.value.renderBody(currentVars.value);
  return renderEmailSkin(body, currentTemplate.value.title);
});

const onSelectTemplate = ({ key }: { key: string }) => {
  const tpl = templates.value.find(t => t.id === key);
  if (tpl) {
    currentVars.value = { ...tpl.defaultVars };
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case '员工': return 'blue';
    case '上级': return 'orange';
    case 'HRBP': return 'purple';
    default: return 'default';
  }
};

const handleSendTestEmail = () => {
  message.success(`测试邮件已模拟发送至当前角色邮箱！`);
};

const copyToClipboard = (val: string) => {
  navigator.clipboard.writeText(val).then(() => {
    message.success('链接已复制到剪贴板');
  });
};
</script>

<style scoped>
.email-demo-container {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}

.sidebar {
  width: 300px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.sidebar-header h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.sidebar-hint {
  margin: 0;
  font-size: 12px;
  color: #999;
  line-height: 1.4;
}

.phase-desc {
  display: block;
  font-size: 12px;
  color: #999;
  font-weight: 400;
  margin-top: 2px;
}

.operation-panel {
  width: 350px;
  padding: 24px;
  flex-shrink: 0;
  overflow-y: auto;
  transition: all 0.3s ease;
  border-left: 1px solid #e8e8e8;
  background: #f0f2f5;
}

.panel-hidden {
  width: 0;
  padding: 0;
  border-left: none;
  overflow: hidden;
}

.preview-panel {
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  background: #fff;
  padding: 16px 24px;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e8e8e8;
  font-size: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-bar {
  background: #fafafa;
  padding: 12px 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-label {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.meta-value {
  font-size: 13px;
  color: #333;
}

.preview-content {
  flex: 1;
  background: #fff;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
</style>
