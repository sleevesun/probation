<template>
  <div class="email-demo-container">
    <!-- 左侧列表 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h3>邮件通知场景</h3>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        style="height: calc(100vh - 64px); overflow-y: auto;"
        @select="onSelectTemplate"
      >
        <a-menu-item-group key="g1" title="1. 目标设定阶段">
          <a-menu-item v-for="t in templates.filter(t => t.id.startsWith('01') || t.id.startsWith('02') || t.id.startsWith('03') || t.id.startsWith('04'))" :key="t.id">
            <a-tag :color="getRoleColor(t.role)" size="small">{{ t.role }}</a-tag> {{ t.title }}
          </a-menu-item>
        </a-menu-item-group>
        <a-menu-item-group key="g2" title="2. 开启试用期评估">
          <a-menu-item v-for="t in templates.filter(t => t.id.startsWith('05') || t.id.startsWith('06') || t.id.startsWith('07'))" :key="t.id">
            <a-tag :color="getRoleColor(t.role)" size="small">{{ t.role }}</a-tag> {{ t.title }}
          </a-menu-item>
        </a-menu-item-group>
        <a-menu-item-group key="g3" title="3. 试用期评估">
          <a-menu-item v-for="t in templates.filter(t => t.id.startsWith('08') || t.id.startsWith('09') || t.id.startsWith('10') || t.id.startsWith('11'))" :key="t.id">
            <a-tag :color="getRoleColor(t.role)" size="small">{{ t.role }}</a-tag> {{ t.title }}
          </a-menu-item>
        </a-menu-item-group>
      </a-menu>
    </div>

    <!-- 中间操作区 -->
    <div class="operation-panel">
      <a-card title="变量配置" :bordered="false" style="margin-bottom: 16px;">
        <template #extra>
          <a-button type="primary" @click="handleSendTestEmail">发送测试邮件</a-button>
        </template>
        
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

    <!-- 右侧预览区 -->
    <div class="preview-panel">
      <div class="preview-header">
        <strong>主题：</strong> {{ currentTemplate?.title }}
      </div>
      <div class="preview-content">
        <!-- 使用 iframe 隔离邮件样式，防止与外部 Vue 组件样式冲突 -->
        <iframe :srcdoc="renderedHtml" frameborder="0" width="100%" height="100%"></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { emailTemplates, renderEmailSkin } from './templates';
import { message } from 'ant-design-vue';

const templates = ref(emailTemplates);
const selectedKeys = ref<string[]>([]);
const currentVars = ref<Record<string, string>>({});

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
  width: 280px;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.operation-panel {
  width: 350px;
  padding: 24px;
  flex-shrink: 0;
  overflow-y: auto;
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
}

.preview-content {
  flex: 1;
  background: #fff;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
</style>